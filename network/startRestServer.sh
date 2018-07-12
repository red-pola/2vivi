#!/bin/bash

. ./common.sh

function printHelp() {
  printHeader
  echo -e "${RESET}Options for this exec are:"
  echo -e "${GREEN}-h ${RESET}Print this help information" | indent
  echo -e "${GREEN}-n ${RESET}defaults to ${GREEN}2vivi-network${RESET}. use ${YELLOW}-n your-named-network ${RESET}if you are using a different network name (you will have to ensure that the name you use here is also the name you use in BOTH package.json files and in your application code)" | indent
  echo ""
  echo ""
}

# Print the header information for execution
function printHeader() {
  echo -e "${YELLOW}This script will create your Composer archive"
  echo ""
}

# Get the command line options
while getopts "h:n:" opt;
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
  esac
done

printHeader
echo "Parameters:"
echo -e "${YELLOW}Network Name is: ${GREEN}$NETWORK_NAME ${RESET}" | indent


showStep "Testing Rest Server\n\twhen this completes,\n\tgo to your favorite browser \n\tand enter localhost:3000/explorer"
showStep "Starting rest server for admin@$NETWORK_NAME"

composer-rest-server --card "admin@$NETWORK_NAME"
