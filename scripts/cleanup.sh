#!/bin/sh

echo "Cleanup Start"
date

echo TTL_MINUTES_PREGEN_XPOP:${TTL_MINUTES_PREGEN_XPOP:-60}
echo TTL_DAYS_XPOP_SOURCE_FILES:${TTL_DAYS_XPOP_SOURCE_FILES:-30}

echo "Cleaning pre-generated HEX xpops"
# Clean pregen XPOP older than 1h (60 minutes after last modified)
find /store/xpop -type f -mmin +${TTL_MINUTES_PREGEN_XPOP:-60} -name '[!.]*' -delete

echo "Cleaning 3-deep ledger source files"
# Clean source data folders older than now +30 day
find /store -type d -mtime +${TTL_DAYS_XPOP_SOURCE_FILES:-30} -name '[!.]*' -mindepth 3 -maxdepth 3 -exec rm -rf {} + 

echo "Cleaning empty dirs"
# Clean EMPTY source data folders older than 5m (just in case they are recently created to be used)
find /store -type d -mmin +5 -name '[!.]*' -empty -delete

echo "Cleanup Done"
date
echo "---"
