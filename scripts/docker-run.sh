#!/bin/bash

source .env && docker run -i --name xpop --rm -p 3000:3000 xpop
