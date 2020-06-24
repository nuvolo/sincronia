import fs from "fs"
import path from "path";
import {init} from "../bootstrap"

let envPath = path.join(process.cwd(), ".env");


test('Credentials undefined when file is missing', async () => {

    if (fs.existsSync(envPath)){
        fs.unlinkSync(envPath)
    }

    console.log("Test LOG", process.cwd(), process.env.SN_USER);
    await init();

    expect(process.env.SN_USER).toBeUndefined();
    expect(process.env.SN_PASSWORD).toBeUndefined();
    expect(process.env.SN_INSTANCE).toBeUndefined();
});
test('Credentials undefined when file is broken', async () => {
    let t_user = "Tyler";
    let t_pass = "Edwards";
    let t_instance = "dev90755.service-now.com";
    fs.writeFile(envPath, 
        'SN_USR=' + t_user + ' \nSN_PASWORD=' + t_pass + ' \nSN_INSTACE=' + t_instance, 
        (err) =>{
            if (err) throw err;
        });
    await init();
    
    expect(process.env.SN_USER).toBeUndefined();
    expect(process.env.SN_PASSWORD).toBeUndefined();
    expect(process.env.SN_INSTANCE).toBeUndefined();
});
test('Credentials correct when file is correct', async () => {
    let t_user = "Tyler";
    let t_pass = "Edwards";
    let t_instance = "dev90755.service-now.com";
    fs.writeFile(envPath, 
        'SN_USER=' + t_user + ' \nSN_PASSWORD=' + t_pass + ' \nSN_INSTANCE=' + t_instance, 
        (err) =>{
            if (err) throw err;
        });
    await init();
    
    expect(process.env.SN_USER).toEqual(t_user);
    expect(process.env.SN_PASSWORD).toEqual(t_pass);
    expect(process.env.SN_INSTANCE).toEqual(t_instance);
});


    
    
    
    
