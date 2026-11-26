#!/usr/bin/env bash
cd packages/ui/dist
ls | head -40; ls | wc -l
echo manifest tags:; grep -o '"tagName": *"[^"]*"' custom-elements.json | sort -u | wc -l
echo define:; grep -rhoE "customElements\.define\(\s*.[a-z-]+" ../src | sort -u | wc -l
echo index gz; gzip -c index.js | wc -c; wc -c index.js
grep -nE '^    "\./' ../package.json | head -20
echo all-js gz; find . -name '*.js' -type f -exec cat {} + | gzip -c | wc -c
