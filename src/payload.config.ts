import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Clients } from './collections/Clients'
import { Jobs } from './collections/Jobs'
import { JobRequests } from './collections/JobRequests'
import { ClientLeadAssignments } from './collections/ClientLeadAssignments'
import { JobLeadAssignments } from './collections/JobLeadAssignments'
import { RecruiterJobAssignments } from './collections/RecruiterJobAssignments'
import { env } from './lib/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const appURL = env.NEXT_PUBLIC_APP_URL

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Clients,
    Jobs,
    JobRequests,
    ClientLeadAssignments,
    JobLeadAssignments,
    RecruiterJobAssignments,
    Media,
  ],
  cors: [appURL],
  csrf: [appURL],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  serverURL: appURL,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  sharp,
  plugins: [],
})
