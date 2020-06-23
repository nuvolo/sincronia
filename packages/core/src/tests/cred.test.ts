import fs from "fs"
import {init} from "../bootstrap"
import dotenv from "dotenv";
import ConfigManager from "../config";


ConfigManager.getEnvPath = jest.fn(() => ".env")



describe('Test ENVCredentials', () =>{
    it("Credentials should be Undefined when False", () => {
        init()

        expect(process.env.SN_USER).toBeUndefined()
        expect(process.env.SN_PASSWORD).toBeUndefined()
        expect(process.env.SN_INSTANCE).toBeUndefined()
    })
    
     fs.writeFile(".env", 
    'SN_USER=Tyler \nSN_PASSWORD=Edwards \nSN_INSTANCE=dev90755.service-now.com', 
    (err) =>{
        if (err) throw err;
    });
    
})

describe('Test ENVCredentials', () =>{
    
    
})
// Create mock credential env files
/*

*/


// Set up Mock test

/* Run test to check that 
erroneous env files are marked erroneous 
correct env files are marked correct */