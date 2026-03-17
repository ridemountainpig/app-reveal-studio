export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };

    reader.onerror = () => {
      reject(
        new Error(
          `File read error: ${reader.error?.message || "Unknown error"}`,
        ),
      );
    };

    reader.onabort = () => {
      reject(new Error("File read aborted"));
    };

    reader.readAsDataURL(file);
  });
}
