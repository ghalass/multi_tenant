pnpm create next-app@latest gmao

pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button scroll-area tabs progress accordion command
pnpm add next-themes

pnpm add prisma @types/node @types/pg --save-dev
pnpm add @prisma/client @prisma/adapter-pg pg dotenv
npx prisma init
npx prisma generate
npx prisma migrate dev --name init

pnpm add zod @hookform/resolvers

pnpm add react-hook-form

pnpm add country-flag-icons

rm -rf node_modules pnpm-lock.yaml && pnpm install

npx prisma db push

pnpm install next-international

****************** après git clone
pnpm install
pnpm prisma generate
pnpm prisma db push

rm -rf .next