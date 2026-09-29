import {cloudConfig} from '../server/cloud-config.js';
try{cloudConfig(process.env);console.log('Cloud configuration format is valid. Remote credentials, email delivery and deployment still require live verification.');}
catch(error){console.error(error.message);process.exitCode=1;}
