#ifndef PULSAR_ENV_H
#define PULSAR_ENV_H

#include <string>

struct Env {

	const unsigned short listeningPort = 8000;
	std::string origin = "*";

	Env() {
	}
};

#endif //PULSAR_ENV_H
