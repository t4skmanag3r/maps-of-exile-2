import axios from 'axios'
import fs from 'fs-extra'
import { google } from 'googleapis'
import path from 'path'

// Load environment variables
dotenv.config()

// Configuration
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = 't4skmanag3r/maps-of-exile-2'
const GITHUB_FOLDER = 'public/map-screenshots'
const GITHUB_BRANCH = 'main'
const LOCAL_TRACK_FILE = './public/synced_files.json'
const TEMP_FOLDER = './public/temp-screenshots'

// Authenticate Google Drive API
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

const drive = google.drive({ version: 'v3', auth })

async function fileExistsOnGitHub(fileName) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FOLDER}/${fileName}`
  try {
    await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
      params: { ref: GITHUB_BRANCH },
    })
    return true
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return false
    }
    throw error
  }
}

async function deleteFromGitHub(fileName) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FOLDER}/${fileName}`
  try {
    // First, get the file's SHA
    const fileResponse = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
      params: { ref: GITHUB_BRANCH },
    })
    const fileSha = fileResponse.data.sha

    // Then delete the file
    await axios.delete(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
      data: {
        message: `Delete ${fileName}`,
        sha: fileSha,
        branch: GITHUB_BRANCH,
      },
    })
    console.log(`Successfully deleted ${fileName} from GitHub`)
  } catch (error) {
    console.error(`Error deleting ${fileName} from GitHub:`, error.response?.data || error.message)
  }
}

async function listDriveFiles() {
  try {
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name)',
    })
    console.log('Drive files found:', res.data.files) // Debug log
    return res.data.files
  } catch (error) {
    console.error('Error fetching files from Drive:', error)
    return []
  }
}

function loadSyncedFiles() {
  try {
    if (fs.existsSync(LOCAL_TRACK_FILE)) {
      const data = fs.readFileSync(LOCAL_TRACK_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading synced_files.json:', error)
  }
  // Return an empty array if file is missing or invalid
  return []
}

function saveSyncedFiles(syncedFiles) {
  fs.writeFileSync(LOCAL_TRACK_FILE, JSON.stringify(syncedFiles, null, 2))
}

async function downloadFile(fileId, fileName) {
  try {
    const destPath = path.join(TEMP_FOLDER, fileName)
    console.log(`Downloading file: ${fileName} to ${destPath}`) // Debug log
    fs.ensureDirSync(TEMP_FOLDER)

    const dest = fs.createWriteStream(destPath)
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })

    await new Promise((resolve, reject) => {
      res.data.on('end', resolve).on('error', reject).pipe(dest)
    })

    console.log(`Downloaded file: ${fileName}`) // Debug log
    return destPath
  } catch (error) {
    console.error(`Error downloading file ${fileName}:`, error)
    throw error
  }
}

async function uploadToGitHub(localPath, fileName) {
  const fileContent = fs.readFileSync(localPath, 'base64') // Read file as base64
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FOLDER}/${fileName}`
  let sha = null

  try {
    // Check if the file exists on GitHub
    const existingFileResponse = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
      params: { ref: GITHUB_BRANCH },
    })

    sha = existingFileResponse.data.sha // Fetch the SHA of the existing file
    console.log(`File exists on GitHub: ${GITHUB_FOLDER}/${fileName}, SHA: ${sha}`)
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`File does not exist on GitHub: ${GITHUB_FOLDER}/${fileName}`)
    } else {
      console.error('Error fetching file info:', error.response || error)
      throw error
    }
  }

  try {
    // Create or update the file on GitHub
    const response = await axios.put(
      url,
      {
        message: `Add or update ${GITHUB_FOLDER}/${fileName}`,
        content: fileContent,
        sha, // Include the SHA if the file already exists
        branch: GITHUB_BRANCH,
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      },
    )

    console.log(`Successfully uploaded: ${GITHUB_FOLDER}/${fileName}`)
    return response.data
  } catch (error) {
    console.error(`Error uploading file ${GITHUB_FOLDER}/${fileName}:`, error.response || error)
    throw error
  }
}

async function main() {
  const driveFiles = await listDriveFiles()
  let syncedFiles = loadSyncedFiles()

  // Create a set of current Drive file names for easy lookup
  const currentDriveFiles = new Set(driveFiles.map((file) => file.name))

  // Check for files to delete
  for (const syncedFile of syncedFiles) {
    if (!currentDriveFiles.has(syncedFile)) {
      console.log(`File no longer in Drive, deleting from GitHub: ${syncedFile}`)
      await deleteFromGitHub(syncedFile)
      syncedFiles = syncedFiles.filter((file) => file !== syncedFile)
    }
  }

  for (const driveFile of driveFiles) {
    const { id: fileId, name: fileName } = driveFile

    if (!syncedFiles.includes(fileName)) {
      console.log(`New file detected: ${fileName}`)

      try {
        // Check if file exists on GitHub
        const existsOnGitHub = await fileExistsOnGitHub(fileName)

        if (!existsOnGitHub) {
          // Download file only if it doesn't exist on GitHub
          const filePath = await downloadFile(fileId, fileName)

          // Upload to GitHub
          await uploadToGitHub(filePath, fileName)

          // Mark file as synced
          syncedFiles.push(fileName)

          fs.unlinkSync(filePath) // Remove the temp file after upload
        } else {
          console.log(
            `File ${GITHUB_FOLDER}/${fileName} already exists on GitHub. Skipping download and upload.`,
          )
          // Mark file as synced even if we didn't upload it
          syncedFiles.push(fileName)
        }
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error)
      }
    } else {
      console.log(`File ${fileName} already synced. Skipping.`)
    }
  }

  saveSyncedFiles(syncedFiles)
}

main().catch(console.error)
