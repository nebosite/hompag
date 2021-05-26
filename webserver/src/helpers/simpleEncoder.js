// @ts-nocheck
var CryptoJS = require('crypto-js');

var SIMPLEKEY="j2spvfTvnPgXMLktb8RuLE3VgjgTeaGp"

var simpleEncode = (text) => { return CryptoJS.AES.encrypt(text, SIMPLEKEY).toString(); }
var simpleDecode = (encryptedText) => { return CryptoJS.AES.decrypt(encryptedText, SIMPLEKEY).toString(CryptoJS.enc.Utf8); }
exports.simpleDecode = simpleDecode

if(process.argv.length === 3)  console.log(simpleEncode(process.argv[2]))
if(process.argv.length === 4)  console.log(simpleDecode(process.argv[3]))
