#include "ws.h"
#include <boost/format.hpp>
#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_io.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/lexical_cast.hpp>

namespace ws {

	const std::string TYPE_JOIN_SYN = "JOIN_SYN";
	const std::string TYPE_JOIN_ACK = "JOIN_ACK";

	const int MESSAGE_TYPE_LENGTH = 4;
	const int UUID_LENGTH = 13;

	//------------------------------------------------------------
	// Session
	//------------------------------------------------------------
	void Session::receive(const boost::asio::yield_context &yield,
						  std::function<void(boost::beast::multi_buffer &&)> onReceive) {

		boost::system::error_code ec;
		while (true) {
			boost::beast::multi_buffer buffer;
			socket->async_read(buffer, yield[ec]);
			if (ec == boost::beast::websocket::error::closed) {
				logger::error("websocket closed");
				break;
			}
			if (ec) {
				//キャンセル要求*(Mac = 89 / ubuntu = 125)
				if (ec.value() == 89 || ec.value() == 125 || ec.value() == 2) {
					logger::error("websocket closed: " + std::to_string(ec.value()));
					break;
				}
				logger::error("websocket read : " + std::to_string(ec.value()));
				continue;
			}

			onReceive(std::move(buffer));
		}
	}

	void Session::send(const boost::beast::multi_buffer &buffer) {
		auto shared = this->shared_from_this();
		boost::asio::spawn(ioc, [shared, buffer](const boost::asio::yield_context &yield) {

			while (shared->writing) { shared->ioc.post(yield); }

			if (shared->disposable) {
				return;
			}
			boost::system::error_code ec;
			if (!shared->socket->is_open()) {
				shared->disposable = true;
				return;
			}
			shared->writing = true;
			shared->socket->async_write(buffer.data(), yield[ec]);
			if (ec) {
				if (ec.value() == 89 || ec.value() == 125 || ec.value() == 2) {
					shared->disposable = true;
				}
				logger::error(ec.message() + " : send ws message : ");
			}
			shared->writing = false;
		});
	}

	void ControlSessions::accept(boost::asio::io_context &ioc, const boost::asio::yield_context &yield, httpserver::WebSocket &&websocket) {

		auto channelId = websocket.params[3];
		auto connectionId = websocket.params[2];
		auto activeUser = std::make_shared<Session>(connectionId, channelId, std::move(websocket.client), ioc);

		if (sessions.find(channelId) == sessions.end()) {
			sessions[channelId] = std::list<Session*>{};
		}
		auto &channelUsers = sessions[channelId];
		channelUsers.push_back(activeUser.get());

		activeUser->receive(yield, [&, connectionId, channelId](boost::beast::multi_buffer &&buffer) {

			auto &joiningUsers = sessions[channelId];
			for (auto active : joiningUsers) {
				if (active->connectionId == connectionId) {
					continue;
				}
				active->send(buffer);
			}

		});

		while (activeUser.use_count() > 1) {
			ioc.post(yield);
		}
		channelUsers.remove(activeUser.get());
	}

}
