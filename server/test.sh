#!/bin/bash
URL_JSON=$(curl -s -X POST http://localhost:3000/upload-url -H "Content-Type: application/json" -d '{"filename":"test.txt","mimetype":"text/plain"}')
URL=$(echo $URL_JSON | grep -o '"url":"[^"]*' | cut -d'"' -f4)
KEY=$(echo $URL_JSON | grep -o '"key":"[^"]*' | cut -d'"' -f4)

echo "Uploading to URL: $URL"
curl -v -X PUT -H "Content-Type: text/plain" -d "Hello RustFS" "$URL"

echo ""
echo "Saving metadata for key: $KEY"
curl -s -X POST http://localhost:3000/metadata -H "Content-Type: application/json" -d "{\"filename\":\"test.txt\",\"key\":\"$KEY\",\"size\":12,\"mimetype\":\"text/plain\"}"
