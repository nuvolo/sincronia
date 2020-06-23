import fs from "fs"
import path from "path";
import {init} from "../bootstrap"
import dotenv from "dotenv";
import ConfigManager from "../config";


ConfigManager.getEnvPath = jest.fn(() => ".env")

let envPath = path.join(process.cwd(), ".env");
console.log(envPath)
describe('Test ENVCredentials', () =>{
    it("Credentials should be Undefined when file is false", () => {
        init()

        expect(process.env.SN_USER).toBeUndefined()
        expect(process.env.SN_PASSWORD).toBeUndefined()
        expect(process.env.SN_INSTANCE).toBeUndefined()
    })
    it("Credentials should be real when file is real", () => {
        fs.writeFile(envPath, 
            'SN_USER=New \nSN_PASSWORD=Edwards \nSN_INSTANCE=dev90755.service-now.com', 
            (err) =>{
                if (err) throw err;
            });
        init()
        
        expect(process.env.SN_USER).toBeUndefined()
        expect(process.env.SN_PASSWORD).toBeUndefined()
        expect(process.env.SN_INSTANCE).toBeUndefined()
    })
    
    
    
    
})
// Create mock credential env files
/*

*/


// Set up Mock test

/* Run test to check that 
erroneous env files are marked erroneous 
correct env files are marked correct */