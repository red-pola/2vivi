#!/bin/bash

. ./common.sh

HLF_INSTALL_PATH="${HOME}/fabric-dev-servers"

# Install the node modules required to work with Hyperledger Composer
function installNodeSDK() {
  showStep "The composer-cli contains all the command line operations for developing business networks."
  npm uninstall -g composer-cli
  npm install -g composer-cli@0.19.12

  showStep "The generator-hyperledger-composer is a Yeoman plugin that creates bespoke applications for your business network."
  npm uninstall -g generator-hyperledger-composer
  npm install -g generator-hyperledger-composer@0.19.12

  showStep "The composer-rest-server uses the Hyperledger Composer LoopBack Connector to connect to a business network, extract the models and then present a page containing the REST APIs that have been generated for the model."
  npm uninstall -g composer-rest-server
  npm install -g composer-rest-server@0.19.12

  showStep "Yeoman is a tool for generating applications. When combined with the generator-hyperledger-composer component, it can interpret business networks and generate applications based on them."
  npm install -g yo
}

# Create a folder for the Hyperledger Fabric images and get them from the server
function installHLF() {
  echo $HLF_INSTALL_PATH

  if [ -d $HLF_INSTALL_PATH ]; then
    showStep "Removing $HLF_INSTALL_PATH"
    rm -R "$HLF_INSTALL_PATH"
  fi
  if [ -d ~/.composer ]; then
    showStep "Removing .composer"
    rm -R ~/.composer
  fi
  if [ -d ~/.composer-credentials ]; then
    showStep "Removing .composer-credentials"
    rm -R ~/.composer-credentials
  fi
  if [ -d ~/.composer-connection-profiles ]; then
    showStep "Removing .composer-connection-profiles"
    rm -R ~/.composer-connection-profiles
  fi

  showStep "Creating hlf tools folder $HLF_INSTALL_PATH "
  mkdir -p "$HLF_INSTALL_PATH"
  cd "$HLF_INSTALL_PATH"
  pwd

  showStep "Retrieving image scripts from git"
  curl -O https://raw.githubusercontent.com/hyperledger/composer-tools/master/packages/fabric-dev-servers/fabric-dev-servers.tar.gz

  showStep "Unzipping images"
  tar -xvf fabric-dev-servers.tar.gz

  showStep "Getting Docker images for HyperLedger Fabric V1.1"
  export FABRIC_VERSION=hlfv11
  cd $HLF_INSTALL_PATH
  ./downloadFabric.sh

  showStep "Updating .profile with new paths"
  export PATH=$HLF_INSTALL_PATH/bin:$PATH
  export HLF_INSTALL_PATH=$HLF_INSTALL_PATH
  # Ensure that the following lines start with a new line
  echo "" >> ~/.profile
  echo "export FABRIC_VERSION=hlfv11" >> ~/.profile
  echo "export HLF_INSTALL_PATH=${HLF_INSTALL_PATH}" >> ~/.profile
  echo "PATH=${HLF_INSTALL_PATH}/bin:"'$PATH' >> ~/.profile
}

function printHelp() {
  printHeader
  echo -e "${RESET}Options for this exec are:"
  echo -e "${GREEN}-h ${RESET}Print this help information" | indent
  echo -e "${GREEN}-p ${RESET}defaults to ${GREEN}${HOME}/fabric-dev-servers${RESET}. use ${YELLOW}-p ${HOME}/your/preferred/path/fabric-tools/your/path/here ${RESET}if you want to install Hyperledger Fabric tools elsewhere." | indent
  echo ""
}

# print the header information for execution
function printHeader() {
  echo -e "${YELLOW}Installation script for the Hyperledger Composer development tools"
  echo -e "${RED}This is for Mac OSX ONLY"
  echo -e "${YELLOW}The script will then install the Node.js SDK for Hyperledger and Composer"
  echo -e "${YELLOW}The script will finish by downloading the Docker images for Hyperledger${RESET}"
  echo ""
}

# Get the command line options
while getopts "h:p:" opt;
do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    p) showStep "Option passed for fabric tools path is: '$OPTARG'"
      if [[ $OPTARG != "" ]]; then
        HLF_INSTALL_PATH=$OPTARG
      fi
    ;;
  esac
done

printHeader
echo "Parameters:"
echo -e "${YELLOW}Hyperledger Fabric tools install path? ${GREEN}$HLF_INSTALL_PATH ${RESET}" | indent

getCurrent

showStep "Installing Node.js SDK for Hyperledger Composer"
installNodeSDK

showStep "Installing Hyperledger Docker images"
installHLF

showStep "Copying PeerAdmin key to .hfc-key-store"
cp -Rv "${HLF_INSTALL_PATH}/fabric-scripts/hlfv1/composer/creds/" "${HOME}/.hfc-key-store"

showStep "Installation complete"
