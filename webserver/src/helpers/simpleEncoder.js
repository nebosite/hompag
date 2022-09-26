// @ts-nocheck
import { AES, enc } from 'crypto-js';

var SIMPLEKEY="j2spvfTvnPgXMLktb8RuLE3VgjgTeaGp"

var simpleEncode = (text) => { return AES.encrypt(text, SIMPLEKEY).toString(); }
var simpleDecode = (encryptedText) => { return AES.decrypt(encryptedText, SIMPLEKEY).toString(enc.Utf8); }
const _simpleDecode = simpleDecode;
export { _simpleDecode as simpleDecode };

if(process.argv.length === 3)  console.log(simpleEncode(process.argv[2]))
if(process.argv.length === 4)  console.log(simpleDecode(process.argv[3]))
