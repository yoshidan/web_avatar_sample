#ifndef PULSAR_HTTPSEVER_H
#define PULSAR_HTTPSEVER_H
#define BOOST_COROUTINES_NO_DEPRECATION_WARNING

#include <iostream>
#include <boost/asio/spawn.hpp>
#include <thread>
#include <string>
#include <cstdlib>
#include <regex>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/websocket.hpp>
#include <logger.h>

namespace httpserver {

	namespace asio = boost::asio;
	namespace beast = boost::beast;

	using BeastHttpRequest = boost::beast::http::request<boost::beast::http::string_body>;
	using BeastHttpResponse = boost::beast::http::response<boost::beast::http::string_body>;
	using BeastWebSocket = boost::beast::websocket::stream<asio::ip::tcp::socket>;

	struct HttpResponse {

		BeastHttpResponse& res;

		explicit HttpResponse(BeastHttpResponse& res) :res(res){

		}

		void setHeader(std::string&& key, std::string value){
			res.base().insert(key,value);
		}

		void notFound(){
			res.result(beast::http::status::not_found);
		}

		void badRequest(){
			res.result(beast::http::status::bad_request);
		}

		void forbidden(){
			res.result(beast::http::status::forbidden);
		}

		void internalServerError(){
			res.result(beast::http::status::internal_server_error);
		}

		void ok(){
			res.result(beast::http::status::ok);
			res.prepare_payload();
		}

		void body(std::string&& body){
			res.body() = std::move(body);
		}
	};

	struct HttpRequest {

		const BeastHttpRequest& req;

		std::smatch params;

		std::string getHeader(std::string&& key) const{
			return req.base()[key].to_string();
		}

		HttpRequest(const BeastHttpRequest& req, std::smatch&& params) :req(req), params(std::move(params)) {

		}
	};


	struct WebSocket : public boost::noncopyable {
		const BeastHttpRequest& req;
		std::smatch params;
		std::unique_ptr<BeastWebSocket> client;

		std::string getHeader(std::string&& key) const{
			return req.base()[key].to_string();
		}

		WebSocket(const BeastHttpRequest& req, std::smatch&& params, std::unique_ptr<BeastWebSocket> ws) :req(req), params(std::move(params)), client(std::move(ws)){

		}
	};

	using HttpHandler = std::function<void(boost::asio::io_context &ioc, boost::asio::yield_context &yield, HttpRequest&, HttpResponse&)>;
	using HttpHandlerPattern = std::pair<std::regex, HttpHandler>;
	using WebSocketHandler = std::function<void(boost::asio::io_context &ioc, boost::asio::yield_context &yield, WebSocket&&)>;
	using WebSocketHandlerPattern = std::pair<std::regex, WebSocketHandler>;

	struct Router {

		std::vector<HttpHandlerPattern> optionsHandlers;
		std::vector<HttpHandlerPattern> getHandlers;
		std::vector<HttpHandlerPattern> postHandlers;
		std::vector<HttpHandlerPattern> patchHandlers;
		std::vector<WebSocketHandlerPattern> wsHandlers;

		Router &options(std::string&& pattern, HttpHandler&& handler) {
			optionsHandlers.emplace_back(std::make_pair(std::regex(pattern), handler));
			return *this;
		}

		Router &get(std::string&& pattern, HttpHandler&& handler) {
			getHandlers.emplace_back(std::make_pair(std::regex(pattern), handler));
			return *this;
		}

		Router &post(std::string&& pattern, HttpHandler&& handler) {
			postHandlers.emplace_back(std::make_pair(std::regex(pattern), handler));
			return *this;
		}

		Router &patch(std::string&& pattern, HttpHandler&& handler) {
			patchHandlers.emplace_back(std::make_pair(std::regex(pattern), handler));
			return *this;
		}

		Router &ws(std::string&& pattern, WebSocketHandler&& handler) {
			wsHandlers.emplace_back(std::make_pair(std::regex(pattern), handler));
			return *this;
		}

	};

	struct ResponseWriter {

		asio::ip::tcp::socket &stream_;
		bool &close_;
		boost::system::error_code &ec_;
		asio::yield_context &yield_;

		const std::string& origin;

		ResponseWriter(
			const std::string& origin,
			asio::ip::tcp::socket &stream,
			bool &close,
			boost::system::error_code &ec,
			asio::yield_context &yield
		) : stream_(stream), close_(close), ec_(ec), yield_(yield) , origin(origin){
		}

		void operator()(BeastHttpResponse& msg) {

			msg.base().insert("Access-Control-Allow-Origin", origin);
			msg.base().insert("Access-Control-Allow-Methods", "POST,GET");
			msg.base().insert("Access-Control-Allow-Headers", "X-API-KEY");

			close_ = msg.need_eof();

			beast::http::serializer<false, beast::http::string_body , beast::http::fields> sr{msg};
			beast::http::async_write(stream_, sr, yield_[ec_]);
		}
	};


	inline BeastHttpResponse createResponse(beast::http::status&& status, const beast::http::request<beast::http::string_body>& req){
		beast::http::response<beast::http::string_body> res{status, req.version()};
		res.set(beast::http::field::server, BOOST_BEAST_VERSION_STRING);
		res.set(beast::http::field::content_type, "application/json");
		res.set(beast::http::field::expires,"-1");
		res.keep_alive(req.keep_alive());
		return res;
	}

	inline BeastHttpResponse notFound(const beast::http::request<beast::http::string_body>& req) {
		auto res = createResponse(beast::http::status::not_found,req);
		res.body() = "The resource '" + req.target().to_string() + "' was not found.";
		res.prepare_payload();
		return res;
	}

	inline BeastHttpResponse healthy(const beast::http::request<beast::http::string_body>& req) {
		auto res = createResponse(beast::http::status::ok,req);
		res.body() = "";
		res.prepare_payload();
		return res;
	}

	inline const std::vector<HttpHandlerPattern>& getHandler(const Router& handlers, beast::http::verb&& method){
		switch(method) {
			case beast::http::verb::options: return handlers.optionsHandlers;
			case beast::http::verb::get: return handlers.getHandlers;
			case beast::http::verb::post: return handlers.postHandlers;
			case beast::http::verb::patch: return handlers.patchHandlers;
			default : return handlers.getHandlers;
		}
	}
	
	void handleHttpRequest(asio::io_context& ioc, asio::yield_context& yield, const Router& handlers, BeastHttpRequest&& req, ResponseWriter& send);

	void handleWSRequest(asio::io_context& ioc, asio::yield_context& yield, const Router& handlers, BeastHttpRequest& req, BeastWebSocket& ws);

	void handleConnection(const Router& handlers, asio::io_context &ioc, asio::ip::tcp::socket &socket, const std::string& origin, asio::yield_context yield);

	void acceptClient(const Router& handlers, asio::io_context &ioc, const asio::ip::tcp::endpoint& endpoint, const std::string& origin, asio::yield_context yield);

	void startServer(const std::string ip , const unsigned short p , asio::io_context& ioc, const Router& handlers, const std::string& origin);

}

#endif