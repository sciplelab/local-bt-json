import { S3 } from "aws-sdk";

const s3 = new S3();

interface Body {
    file_type: string;
    file_origin?: string;
}

async function getUploadUrl({ body }: { body: string }) {
  const temp_json: Body = JSON.parse(body);
  const result = await getUploadURL(temp_json.file_type, temp_json.file_origin);
  return result;
}

const generateFileName = function () {
  const timestamp = Date.now();
  const randomString = Math.random() * 1000000000000;
  return `${timestamp}${randomString}`;
};

const getUploadURL = async function (file_type: string, file_origin?: string) {
  var filename = generateFileName();

  console.log(file_type);
  var file_name = ".jpg";
  if (file_origin) {
    filename = file_origin + filename;
  }
  if (file_type == "image/png") {
    file_name = ".png";
  } else if (file_type == "image/jpeg") {
    file_name = ".jpeg";
  }
  const s3Params = {
    Bucket: process.env.UploadBucket,
    Key: filename + file_name,
    ContentType: file_type, // Update to match whichever content type you need to upload
    //ACL: 'public-read'      // Enable this setting to make the object publicly readable - only works if the bucket can support public objects
  };

  console.log("getUploadURL: ", s3Params);
  return new Promise((resolve, reject) => {
    // Get signed URL
    resolve({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        uploadURL: s3.getSignedUrl("putObject", s3Params),
        photoFilename: filename + file_name,
      }),
    });
  });
};