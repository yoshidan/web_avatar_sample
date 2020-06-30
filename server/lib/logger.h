#ifndef PULSAR_LOGGER_H
#define PULSAR_LOGGER_H

#include <iostream>
#include <thread>

namespace logger {

	inline std::chrono::system_clock::time_point now() {
		return std::chrono::system_clock::now();
	}

	inline std::string nowAsString() {
		std::time_t end_time = std::chrono::system_clock::to_time_t(now());
		return std::string(std::ctime(&end_time),24);
	}

	inline double elapsed(const std::chrono::system_clock::time_point& start, const std::chrono::system_clock::time_point& end) {
		return std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
	}

	template <typename T>
	void info(T&& what) {
		std::cout << nowAsString() << " : " << what << std::endl;
	}

	template <typename T>
	void debug(T&& what) {
#ifdef APP_DEBUG
        std::cout << nowAsString() << " : " << what << std::endl;
#endif
	}

	template <typename T>
	void error(T&& what) {
		std::cerr << nowAsString() << " : " << what << "\n";
	}

}
#endif