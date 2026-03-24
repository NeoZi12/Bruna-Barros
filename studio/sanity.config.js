import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas/index.js'
import { deskStructure } from './structure.js'

export default defineConfig({
  name: 'bruna-barros',
  title: 'Bruna Barros',
  projectId: 'u3pno5p8',
  dataset: 'production',

  plugins: [
    structureTool({ structure: deskStructure }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
