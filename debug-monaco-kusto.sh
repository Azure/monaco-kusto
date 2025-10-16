#!/bin/bash

MONACO_KUSTO_FOLDER="monaco-kusto/package"
WEB_UX_FOLDER="Azure-Kusto-WebUX"
KUSTOWEB_FOLDER="kustoweb"
FABRIC_FOLDER="tridentkustoextension"

SOURCE_FOLDER="$MONACO_KUSTO_FOLDER/release"
DESTINATION_FOLDER="$WEB_UX_FOLDER/node_modules/@kusto/monaco-kusto/release"

# Save the current directory
CURRENT_DIR=$(pwd)

# Step 1: Go to MONACO_KUSTO_FOLDER and run 'yarn build'
cd "$MONACO_KUSTO_FOLDER" || { echo "Failed to change directory to $MONACO_KUSTO_FOLDER"; exit 1; }
yarn build && echo "Successfully built monaco-kusto"
cd "$CURRENT_DIR" || { echo "Failed to return to the original directory"; exit 1; }

# Step 2: Delete DESTINATION_FOLDER if it exists
 if [ -d "$DESTINATION_FOLDER" ]; then
   rm -rf "$DESTINATION_FOLDER"
   echo "Deleted existing folder at $DESTINATION_FOLDER"
 fi

# Step 3: Copy SOURCE_FOLDER to DESTINATION_FOLDER
cp -r "$SOURCE_FOLDER" "$DESTINATION_FOLDER" && echo "Copied folder from $SOURCE_FOLDER to $DESTINATION_FOLDER"

## Step 4: KWE > Go to WEB_UX_FOLDER and run start the app
cd "$WEB_UX_FOLDER" || { echo "Failed to change directory to $WEB_UX_FOLDER"; exit 1; }
yarn clean-build-cache && echo "Successfully cleaned build cache"
cd "$KUSTOWEB_FOLDER" || { echo "Failed to change directory to $KUSTOWEB_FOLDER"; exit 1; }
yarn build:dev && echo "Successfully built all packages"
yarn start && echo "Successfully started the application"

#cd kustoWeb
#yarn test:integration

## Step 4: Fabric > Go to WEB_UX_FOLDER and run start the app
#cd "$WEB_UX_FOLDER" || { echo "Failed to change directory to $WEB_UX_FOLDER"; exit 1; }
#yarn clean-vite-cache && echo "Successfully cleaned build cache"
#cd "$FABRIC_FOLDER" || { echo "Failed to change directory to $FABRIC_FOLDER"; exit 1; }
#yarn build:dev && yarn start:dev --force && echo "Successfully started the application"
