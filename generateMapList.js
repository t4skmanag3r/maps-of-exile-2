//? scriptas parsina per screenshotu folderi ir sukelia names/paths i maps.json faila

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const screenshotsDir = path.join(__dirname, 'public', 'map-screenshots')
const outputFile = path.join(__dirname, 'public', 'maps.json')

async function generateMapList() {
  try {
    const files = await fs.readdir(screenshotsDir)

    const maps = files
      .filter((file) => file.endsWith('.jpg') || file.endsWith('.png'))
      .map((file) => {
        const [name, extra] = path
          .basename(file, path.extname(file))
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
          .split('-')

        const formattedName = extra ? `${name} (${extra})` : name

        return {
          name: formattedName,
          imageUrl: `/map-screenshots/${file}`,
        }
      })

    await fs.writeFile(outputFile, JSON.stringify(maps, null, 2))
    console.log(`Successfully wrote ${maps.length} maps to ${outputFile}`)
  } catch (err) {
    console.error('Error:', err)
  }
}

generateMapList()
