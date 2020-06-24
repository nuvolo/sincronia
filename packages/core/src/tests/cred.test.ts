import fs from "fs"
import path from "path";
import {init} from "../bootstrap"

let envPath = path.join(process.cwd(), ".env");

test('Credentials undefined when file is missing', async () => {
    // Removes any existing test env file from past tests
    if (fs.existsSync(envPath)){
        fs.unlinkSync(envPath)
    }
    // Run init command (command being tested)
    await init();
    // Check "process" variables match expected results
    expect(process.env.SN_USER).toBeUndefined();
    expect(process.env.SN_PASSWORD).toBeUndefined();
    expect(process.env.SN_INSTANCE).toBeUndefined();
});
test('Credentials undefined when file is broken', async () => {
    // Sample Credential Data
    let t_user = "Tyler";
    let t_pass = "Edwards";
    let t_instance = "dev90755.service-now.com";
    // Create a faulty .env file
    fs.writeFile(envPath, 
        'SN_USR=' + t_user + ' \nSN_PASWORD' + t_pass + ' \nSN_INSTACE=' + t_instance, 
        (err) =>{
            if (err) throw err;
        });
    // Run init command (command being tested)
    await init();
    // Check "process" variables match expected results
    expect(process.env.SN_USER).toBeUndefined();
    expect(process.env.SN_PASSWORD).toBeUndefined();
    expect(process.env.SN_INSTANCE).toBeUndefined();
});
test('Credentials correct when file is correct', async () => {
    // Sample Credential Data
    let t_user = "Tyler";
    let t_pass = "Edwards";
    let t_instance = "dev90755.service-now.com";
    // Create a correct .env file
    fs.writeFile(envPath, 
        'SN_USER=' + t_user + ' \nSN_PASSWORD=' + t_pass + ' \nSN_INSTANCE=' + t_instance, 
        (err) =>{
            if (err) throw err;
        });
    // Run init command (command being tested)
    await init();
    // Check "process" variables match expected results
    expect(process.env.SN_USER).toEqual(t_user);
    expect(process.env.SN_PASSWORD).toEqual(t_pass);
    expect(process.env.SN_INSTANCE).toEqual(t_instance);
});


    
    
    
    
