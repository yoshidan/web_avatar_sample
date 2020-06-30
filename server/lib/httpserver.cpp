#include <httpserver.h>

namespace httpserver {

	void handleHttpRequest(asio::io_context& ioc, asio::yield_context& yield, const Router& handlers, BeastHttpRequest&& req, ResponseWriter& send) {

		auto const header = req.base();
		auto const path = req.target().to_string();

		for (auto& h : getHandler(handlers,req.method())){

			std::smatch m;
			if(std::regex_match(path, m, h.first)){
				HttpRequest request{req,std::move(m)};
				auto start = logger::now();
				logger::info("request : " + req.method_string().to_string() + " : " + req.target().to_string() );

				auto res = createResponse(beast::http::status::not_implemented,req);
				auto wrapedResponse = HttpResponse{res};
				h.second(ioc, yield, request, wrapedResponse);

				res.keep_alive(req.keep_alive());
				res.prepare_payload();

				logger::info("response : " + req.method_string().to_string() + " : " + req.target().to_string() + " : "
							 + std::to_string(logger::elapsed(start, logger::now())));

				return send(res);
			}
		}

		// "/" is health check request
		if(path != "/") {
			logger::error("handler not found: " + req.method_string().to_string() + " : " + req.target().to_string());
			auto res = notFound(req);
			return send(res);
		}else {
			auto res = healthy(req);
			return send(res);
		}


	}

	void handleConnection(const Router& handlers, asio::io_context &ioc, asio::ip::tcp::socket &socket, const std::string& origin, asio::yield_context yield) {

		bool close = false;
		boost::system::error_code ec;
		boost::beast::flat_buffer buffer;
		ResponseWriter writer{origin, socket, close, ec, yield};

		while(true){
			BeastHttpRequest req;
			beast::http::async_read(socket, buffer, req, yield[ec]);
			if (ec == beast::http::error::end_of_stream)
				break;
			if (ec)
				return logger::error( ec.message() + ":read");

			if(beast::websocket::is_upgrade(req)){

				// check origin
				auto reqOrigin = req.base()["Origin"].to_string();
				if(origin != "*") {
					if (origin != reqOrigin) {
						logger::error("Illegal Origin " + origin);
						return;
					}
				}

				auto ws = std::make_unique<BeastWebSocket>(BeastWebSocket{std::move(socket)});
				ws->async_accept(req, yield[ec]);

				if (ec)
					return logger::error( ec.message() +  "websocket accept");

				logger::info("websocket connected : " + req.target().to_string());

				auto path = req.target().to_string();

				for (auto& h : handlers.wsHandlers){
					std::smatch m{};
					if(std::regex_match(path, m, h.first)) {
						h.second(ioc, yield, WebSocket{req,std::move(m),std::move(ws)});
						return;
					}
				}
				
				logger::info("websocket disconnected : " + req.target().to_string());

				return;
			}else {
				handleHttpRequest(ioc, yield, handlers, std::move(req), writer);
				if (ec)
					return logger::error( ec.message() +  "write");
				if (close) {
					break;
				}

			}
		}

		socket.shutdown(asio::ip::tcp::socket::shutdown_send, ec);

	}

	void acceptClient(const Router& handlers, asio::io_context &ioc, const asio::ip::tcp::endpoint& endpoint, const std::string& origin, asio::yield_context yield) {

		boost::system::error_code ec;

		asio::ip::tcp::acceptor acceptor(ioc);
		acceptor.open(endpoint.protocol(), ec);
		if (ec) return logger::error( ec.message() +  "open");

		acceptor.set_option(asio::socket_base::reuse_address(true));

		acceptor.bind(endpoint, ec);
		if (ec) return logger::error( ec.message() +  "bind");

		acceptor.listen(asio::socket_base::max_listen_connections, ec);
		if (ec) return logger::error( ec.message() +  "listen");

		while(true) {
			asio::ip::tcp::socket socket(ioc);
			acceptor.async_accept(socket, yield[ec]);
			if (ec) {
				logger::error( ec.message() +  "accept");
			}  else {
				asio::spawn(acceptor.get_executor().context(), std::bind(
					&handleConnection,
					handlers,
					std::ref(ioc),
					std::move(socket),
					origin,
					std::placeholders::_1));
			}
		}
	}

	void startServer(const std::string ip , const unsigned short p , asio::io_context& ioc, const Router& handlers, const std::string& origin) {

		auto const address = asio::ip::make_address(ip);
		asio::spawn(ioc,
					std::bind(
						&acceptClient,
						handlers,
						std::ref(ioc),
						asio::ip::tcp::endpoint{address, p},
						origin,
						std::placeholders::_1));

	}
}

