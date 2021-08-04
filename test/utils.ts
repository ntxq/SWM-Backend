import { JSON_DIR, IMAGE_DIR } from 'src/modules/const';
import fs from 'fs';
import path from 'path';

export function clearDirectory(directory:string,extensions:Array<string>){
    const files = fs.readdirSync(directory)
    for (const file of files) {
        const file_path = path.join(directory, file)
        if(!fs.lstatSync(file_path).isDirectory()){
            if(extensions.includes(path.extname(file_path)))
                fs.unlinkSync(file_path)
        }
        else if(file != directory){
            clearDirectory(file_path,extensions)
        }
    }
}
export function clearTestImage(){
    const directory = IMAGE_DIR
    const extensions = ['.png']
    const files = fs.readdirSync(directory)
    for (const file of files) {
        const file_path = path.join(directory, file)
        if(!fs.lstatSync(file_path).isDirectory()){
            if(extensions.includes(path.extname(file_path)))
                fs.unlinkSync(file_path)
        }
        else{
            
            clearDirectory(file_path,extensions)
        }
    }
}

export function clearTestJSON(){
    const directory = JSON_DIR
    const extensions = ['.json']
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error(err)
            throw err;
        }
      
        for (const file of files) {
            const file_path = path.join(directory, file)
            if(!fs.lstatSync(file_path).isDirectory()){
                if(extensions.includes(path.extname(file_path)))
                    fs.unlinkSync(file_path)
            }
            else{
                clearDirectory(file_path,extensions)
            }
        }
    });
}