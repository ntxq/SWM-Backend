import { JSON_DIR, IMAGE_DIR } from "src/modules/const";
import fs from "fs";
import path from "path";

export function clearDirectory(directory: string, extensions: Array<string>) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const filePath = path.posix.join(directory, file);
    if (!fs.lstatSync(filePath).isDirectory()) {
      if (extensions.includes(path.extname(filePath))) fs.unlinkSync(filePath);
    } else if (file != directory) {
      clearDirectory(filePath, extensions);
    }
  }
}
export function clearTestImage() {
  const directory = IMAGE_DIR;
  const extensions = [".png"];
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const filePath = path.posix.join(directory, file);
    if (!fs.lstatSync(filePath).isDirectory()) {
      if (extensions.includes(path.extname(filePath))) fs.unlinkSync(filePath);
    } else {
      clearDirectory(filePath, extensions);
    }
  }
}

export function clearTestJSON() {
  const directory = JSON_DIR;
  const extensions = [".json"];
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(err);
      throw err;
    }

    for (const file of files) {
      const filePath = path.posix.join(directory, file);
      if (!fs.lstatSync(filePath).isDirectory()) {
        if (extensions.includes(path.extname(filePath)))
          fs.unlinkSync(filePath);
      } else {
        clearDirectory(filePath, extensions);
      }
    }
  });
}
