#!/bin/bash

. ./common.sh

showStep "Using execs from previous installation, stored in ${HLF_INSTALL_PATH}"
cd "${HLF_INSTALL_PATH}"

showStep "Starting Fabric"
./startFabric.sh

showStep "Creating new PeerAdmin card (required with each restart)"
./createPeerAdminCard.sh
composer card list --card PeerAdmin@hlfv1

showStep "Start up complete"
