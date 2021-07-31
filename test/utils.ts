import { JSON_DIR, IMAGE_DIR } from 'src/modules/const';
import fs from 'fs';
import path from 'path';

export function clearDirectory(directory:string){
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
      
        for (const file of files) {
            const file_path = path.join(directory, file)
            if(!fs.lstatSync(file_path).isDirectory()){
                fs.unlink(file_path, err => {
                    if (err) throw err;
                });
            }
            else{
                clearDirectory(directory)
            }
        }
    });
}
export function clearTestImage(){
    const directory = IMAGE_DIR
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error(err)
            throw err;
        }
      
        for (const file of files) {
            const file_path = path.join(directory, file)
            if(!fs.lstatSync(file_path).isDirectory()){
                fs.unlink(file_path, err => {
                    if (err) throw err;
                });
            }
            else{
                clearDirectory(file_path)
            }
        }
    });
}

export function clearTestJSON(){
    const directory = JSON_DIR
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error(err)
            throw err;
        }
      
        for (const file of files) {
            const file_path = path.join(directory, file)
            if(!fs.lstatSync(file_path).isDirectory()){
                fs.unlink(file_path, err => {
                    if (err) throw err;
                });
            }
            else{
                clearDirectory(file_path)
            }
        }
    });
}