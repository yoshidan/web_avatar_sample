cmake_minimum_required(VERSION 3.10)
project(pulsar_control)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -DAPP_DEBUG")
find_package(Boost REQUIRED system coroutine)

file(GLOB SRC_CPP "lib/*.cpp" "main.cpp" "app/*.cpp")
add_executable(pulsar_control ${SRC_CPP})

include_directories(${Boost_INCLUDE_DIR} lib)

if(CMAKE_C_PLATFORM_ID STREQUAL "Darwin")
    set(DEPENDEICIES ${Boost_LIBRARIES} )
else()
    set(DEPENDEICIES ${Boost_LIBRARIES} pthread)
endif()

target_link_libraries(pulsar_control ${DEPENDEICIES})

