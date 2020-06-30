#ifndef PULSAR_WS_H
#define PULSAR_WS_H
#define BOOST_COROUTINES_NO_DEPRECATION_WARNING

#include <boost/asio/spawn.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/io_context.hpp>
#include <algorithm>
#include <map>
#include <list>
#include <httpserver.h>

namespace ws {

    using ConnectionId = std::string;
    using ChannelId = std::string;

    /**
     * WebSocket Session
     */
    class Session : public std::enable_shared_from_this<Session> {

    private:

        const std::unique_ptr<httpserver::BeastWebSocket> socket;

        boost::asio::io_context& ioc;


    public:
        const ConnectionId connectionId;

        const ChannelId channelId;

        bool disposable = false;

        bool writing = false;

        /**
         * Send data to remote.
         */
        void send(const boost::beast::multi_buffer &buffer);

        void receive(const boost::asio::yield_context &yield, std::function<void(boost::beast::multi_buffer&&)> onReceive);

        Session(
                ConnectionId connectionId,
                ChannelId channelId,
                std::unique_ptr<httpserver::BeastWebSocket> socket,
                boost::asio::io_context& ioc
        ) : connectionId(std::move(connectionId)),channelId(std::move(channelId)), socket(std::move(socket)), ioc(ioc){
        }
    };


    /**
     * Control Sessions
     */
    class ControlSessions {

    private:
        std::map<ChannelId, std::list<Session*>> sessions;

    public:

        void accept(boost::asio::io_context &ioc, const boost::asio::yield_context &yield, httpserver::WebSocket &&websocket);


    };

}

#endif
