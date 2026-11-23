-- CreateTable
CREATE TABLE "public"."MiniAppLinkName" (
    "name" TEXT NOT NULL,
    "miniAppId" TEXT NOT NULL,
    "canonicalForId" TEXT,

    CONSTRAINT "MiniAppLinkName_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "MiniAppLinkName_canonicalForId_key" ON "public"."MiniAppLinkName"("canonicalForId");

-- CreateIndex
CREATE INDEX "MiniAppLinkName_miniAppId_idx" ON "public"."MiniAppLinkName"("miniAppId");

-- AddForeignKey
ALTER TABLE "public"."MiniAppLinkName" ADD CONSTRAINT "MiniAppLinkName_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A Link Name and a slug share one namespace, and a name is stored lowercase.
-- Prisma cannot express either rule (the unique is across two tables, and
-- lowercasing is not a column default), so the database enforces both here.
-- Multiple null `canonicalForId`s are allowed by the unique index above, which
-- is what lets every replaced name stay held.

CREATE FUNCTION "public"."mini_app_link_name_namespace"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."name" <> lower(NEW."name") THEN
    RAISE EXCEPTION 'link name must be stored lowercase' USING ERRCODE = '23514';
  END IF;

  IF NEW."canonicalForId" IS NOT NULL AND NEW."canonicalForId" <> NEW."miniAppId" THEN
    RAISE EXCEPTION 'canonical link name must belong to its mini-app' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."MiniApp" WHERE lower("slug") = NEW."name"
  ) THEN
    RAISE EXCEPTION 'link name clashes with a mini-app slug'
      USING ERRCODE = '23505', CONSTRAINT = 'MiniAppLinkName_name_not_slug';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "mini_app_link_name_namespace"
BEFORE INSERT OR UPDATE OF "name", "miniAppId", "canonicalForId"
ON "public"."MiniAppLinkName"
FOR EACH ROW EXECUTE FUNCTION "public"."mini_app_link_name_namespace"();

CREATE FUNCTION "public"."mini_app_slug_not_held_link_name"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."MiniAppLinkName" WHERE "name" = lower(NEW."slug")
  ) THEN
    RAISE EXCEPTION 'mini-app slug clashes with a held link name'
      USING ERRCODE = '23505', CONSTRAINT = 'MiniApp_slug_not_link_name';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "mini_app_slug_not_held_link_name"
BEFORE INSERT OR UPDATE OF "slug"
ON "public"."MiniApp"
FOR EACH ROW EXECUTE FUNCTION "public"."mini_app_slug_not_held_link_name"();
