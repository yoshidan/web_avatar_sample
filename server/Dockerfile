FROM yoshidan/ubuntu-clang-boost

RUN mkdir -p /work/pulsar
ADD . /work/pulsar
RUN cd /work/pulsar && cmake -DCMAKE_BUILD_TYPE=Release -G "CodeBlocks - Unix Makefiles" .
RUN cd /work/pulsar && cmake --build . --target all -j 1

CMD /work/pulsar/pulsar_control
