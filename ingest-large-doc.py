#!/usr/bin/env python3
import json
import requests

# Read the test document
with open('test-document.txt', 'r') as f:
    content = f.read()

# Prepare the API request
payload = {
    "messages": [{
        "role": "user",
        "content": content
    }],
    "mode": "ingest"
}

print(f"Ingesting document ({len(content)} characters)...")
print("This may take 30-60 seconds for Claude to process...")

# Make the request
response = requests.post(
    'http://localhost:3002/api/chat',
    headers={'Content-Type': 'application/json'},
    json=payload,
    timeout=120
)

# Print results
if response.status_code == 200:
    result = response.json()
    print(f"\n✅ SUCCESS!")
    print(f"\nExtracted:")
    print(f"  - {len(result['data']['triples'])} triples")
    print(f"  - {len(result['data']['orphan_entities'])} orphan entities")
    print(f"  - {len(result['data']['ambiguities'])} ambiguities")

    # Show first few triples
    print(f"\nFirst 5 triples:")
    for i, triple in enumerate(result['data']['triples'][:5]):
        print(f"  {i+1}. {triple['a']} --[{triple['relation']}]--> {triple['b']}")
else:
    print(f"\n❌ ERROR: {response.status_code}")
    print(response.text)
