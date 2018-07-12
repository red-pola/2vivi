#!/bin/bash

. ./common.sh

showStep "Using execs from previous installation, stored in ${HLF_INSTALL_PATH}"
cd "${HLF_INSTALL_PATH}"

showStep "Stopping Fabric"
./stopFabric.sh

showStep "Tear down"
./teardownFabric.sh

showStep "Shut down complete"
