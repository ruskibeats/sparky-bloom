#!/bin/bash
# Run expo with no-sandbox to work around root restriction
node --no-sandbox $(which expo) start --port 8085 --host localhost
