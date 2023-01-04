import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { getDatabase } from './db';

import {
  getAccessToken,
  getAuthorizationUrl,
  promptForUserAction,
} from './auth';
import { Queue } from './Queue';
const extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'mov', 'mp4'];

const uploadQueue = new Queue();

main();

async function setupUploadWatcher() {
  const { db } = await getDatabase();

  const token = db.get('access_token');

  // if no token, sleep one second
  // if token, start watching

  if (!token) {
    setTimeout(setupUploadWatcher, 5000);
    return;
  }

  uploadQueue.process(async job => {
    console.log(`Starting upload for ${job.data.filePath}`);

    const filePath = job.data.filePath as string;

    try {
      const mediaItems = await upload(filePath);

      const wasSuccessful = wasSuccessfulUpload(mediaItems[0]);

      console.log(
        `Finished upload for ${job.data.filePath}. Upload was successful: ${wasSuccessful}`
      );

      if (wasSuccessful) {
        console.log(`Deleting file ${job.data.filePath}`);
        await fs.unlink(filePath);
      }
    } catch (e) {
      // console.log('error occurred', e);
    }
  });

  const watcher = chokidar.watch(
    extensions.map(ext => path.resolve(__dirname, `./consume/*.${ext}`)),
    { ignoreInitial: false }
  );

  watcher.on('remove', path => {
    console.log(`File ${path} has been removed`);
  });

  watcher.on('add', async filePath => {
    uploadQueue.add({ filePath });
  });
}

async function main() {
  const { db } = await getDatabase();

  if (!db.get('access_token')) {
    // TODO: Setup tunnel with ngrok or similar so we can get the code

    const authUrl = await getAuthorizationUrl();

    console.log('prompting for action');
    promptForUserAction(authUrl);
  }

  console.log('setting up watchers');
  setupUploadWatcher();
}

type UploadItem = {
  fileName: string;
  uploadToken: string;
};

async function createMediaItems(items: UploadItem[]): Promise<MediaItem[]> {
  const token = await getAccessToken();

  console.log('creating media items with token', token);

  return axios
    .post<{ newMediaItemResults: MediaItem[] }>(
      'https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate',
      {
        newMediaItems: items.map(item => ({
          simpleMediaItem: {
            fileName: item.fileName,
            uploadToken: item.uploadToken,
          },
        })),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then(res => res.data.newMediaItemResults);
}

async function getUploadToken(data: Buffer): Promise<string> {
  const token = await getAccessToken();

  return axios
    .post<string>('https://photoslibrary.googleapis.com/v1/uploads', data, {
      headers: {
        'Content-type': 'application/octet-stream',
        'X-Goog-Upload-Protocol': 'raw',
        Authorization: `Bearer ${token}`,
      },
    })
    .then(res => res.data);
}

type MediaItem = {
  uploadToken: string;
  status: { message: string };
};

const wasSuccessfulUpload = (mediaItem: MediaItem) => {
  return mediaItem.status.message === 'Success';
};

async function upload(filePath: string) {
  const fileName = path.basename(filePath);

  const data = await fs.readFile(filePath);

  console.log('getting upload token');
  const uploadToken = await getUploadToken(data);

  const mediaItems = await createMediaItems([
    {
      fileName,
      uploadToken,
    },
  ]);

  return mediaItems;
}

// upload(
//   '/Users/schester/work/docker-google-photos-backup/src/consume/Media To Server_NAS.png'
// );
