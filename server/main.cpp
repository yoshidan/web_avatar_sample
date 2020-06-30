#include <iostream>
#include <boost/beast/http.hpp>
#include <httpserver.h>
#include <logger.h>
#include "app/ws.h"
#include "env.h"

int main() {

	auto env = Env();
	boost::asio::io_context ioc(1);

	auto controlSessions = ws::ControlSessions();

	auto router = httpserver::Router{}.ws("/ws/control\\?channelId=(.+)&uuid=(.+)",
		[&](boost::asio::io_context &ioc, const boost::asio::yield_context &yield, httpserver::WebSocket &&websocket) {
			controlSessions.accept(ioc, yield, std::move(websocket));
			return;
	});

	logger::info("Start WebSocket Server on port " + std::to_string(env.listeningPort));
	httpserver::startServer("0.0.0.0", env.listeningPort, ioc, router, env.origin);

	ioc.run();

	return 0;
}