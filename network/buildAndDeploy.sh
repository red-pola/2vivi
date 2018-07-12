#!/bin/bash

. ./common.sh

function printHelp() {
  printHeader
  echo -e "${RESET}Options for this exec are:"
  echo -e "${GREEN}-h ${RESET}Print this help information" | indent
  echo -e "${GREEN}-n ${RESET}Network name: defaults to ${GREEN}2vivi-network${RESET}. use ${YELLOW}-n your-named-network ${RESET}if you are using a different network name (you will have to ensure that the name you use here is also the name you use in BOTH package.json files and in your application code)" | indent
  echo -e "${GREEN}-v ${RESET}Network version: defaults to ${GREEN}$NETWORK_VERSION${RESET}" | indent
  echo ""
  echo ""
}

# print the header information for execution
function printHeader() {
  echo -e "${YELLOW}Network archive, start and deploy script"
  echo -e "${YELLOW}This script will create your Composer archive"
  echo ""
}

# Get the command line options
while getopts "h:n:v:" opt;
do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    n) showStep "option passed for network name is: '$OPTARG'"
      if [[ $OPTARG != "" ]]; then
        NETWORK_NAME=$OPTARG
      fi
    ;;
    v) showStep "option passed for network version is: '$OPTARG'"
      if [[ $OPTARG != "" ]]; then
        NETWORK_VERSION=$OPTARG
      fi
    ;;
  esac
done

printHeader
echo "Parameters:"
echo -e "${YELLOW}Network Name is: ${GREEN}$NETWORK_NAME" | indent
echo -e "${YELLOW}Network Version is: ${GREEN}$NETWORK_VERSION ${RESET}" | indent

showStep "Creating archive"
./createArchive.sh -n $NETWORK_NAME

showStep "Starting network"
./startup.sh

showStep "Deploying network"
./deployNetwork.sh -n $NETWORK_NAME -v $NETWORK_VERSION
