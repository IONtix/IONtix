import prisma from "@/lib/prisma";

async function main() {
  const sport = await prisma.sport.findUnique({
    where: {
      slug: "running",
    },
  });

  if (!sport) {
    throw new Error(
      'Sport "running" belum tersedia.',
    );
  }

  const template =
    await prisma.formTemplate.upsert({
      where: {
        sportId_slug: {
          sportId: sport.id,
          slug: "running-registration",
        },
      },
      update: {
        name: "Running Registration",
        description:
          "Template registrasi standar untuk event running.",
        isSystem: true,
        isActive: true,
        allowEOEdit: true,
      },
      create: {
        sportId: sport.id,
        name: "Running Registration",
        slug: "running-registration",
        description:
          "Template registrasi standar untuk event running.",
        isSystem: true,
        isActive: true,
        allowEOEdit: true,
      },
    });

  const version =
    await prisma.formVersion.upsert({
      where: {
        formTemplateId_version: {
          formTemplateId: template.id,
          version: 1,
        },
      },
      update: {
        status: "PUBLISHED",
        publishedAt:
          new Date(),
      },
      create: {
        formTemplateId: template.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt:
          new Date(),
      },
    });

  const fields = [
    {
      key: "full_name",
      label: "Nama Lengkap",
      fieldType: "TEXT" as const,
      order: 10,
      isRequired: true,
      isSystem: true,
      isEditableByEO: false,
      isVisible: true,
    },
    {
      key: "email",
      label: "Email",
      fieldType: "EMAIL" as const,
      order: 20,
      isRequired: true,
      isSystem: true,
      isEditableByEO: false,
      isVisible: true,
    },
    {
      key: "phone",
      label: "Nomor Telepon",
      fieldType: "PHONE" as const,
      order: 30,
      isRequired: true,
      isSystem: true,
      isEditableByEO: false,
      isVisible: true,
    },
    {
      key: "date_of_birth",
      label: "Tanggal Lahir",
      fieldType: "DATE" as const,
      order: 40,
      isRequired: true,
      isSystem: false,
      isEditableByEO: true,
      isVisible: true,
    },
    {
      key: "gender",
      label: "Jenis Kelamin",
      fieldType: "GENDER" as const,
      order: 50,
      isRequired: true,
      isSystem: false,
      isEditableByEO: true,
      isVisible: true,
    },
    {
      key: "emergency_contact",
      label: "Kontak Darurat",
      fieldType:
        "EMERGENCY_CONTACT" as const,
      order: 60,
      isRequired: true,
      isSystem: false,
      isEditableByEO: true,
      isVisible: true,
    },
  ];

  for (const field of fields) {
    await prisma.formField.upsert({
      where: {
        formVersionId_key: {
          formVersionId:
            version.id,
          key: field.key,
        },
      },
      update: {
        label: field.label,
        fieldType: field.fieldType,
        order: field.order,
        isRequired:
          field.isRequired,
        isSystem:
          field.isSystem,
        isEditableByEO:
          field.isEditableByEO,
        isVisible:
          field.isVisible,
      },
      create: {
        formVersionId:
          version.id,
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        order: field.order,
        isRequired:
          field.isRequired,
        isSystem:
          field.isSystem,
        isEditableByEO:
          field.isEditableByEO,
        isVisible:
          field.isVisible,
      },
    });
  }

  console.log(
    "✅ Running Registration Template berhasil disiapkan.",
  );

  console.dir(
    {
      sport: {
        id: sport.id,
        name: sport.name,
        slug: sport.slug,
      },
      template: {
        id: template.id,
        name: template.name,
        slug: template.slug,
      },
      version: {
        id: version.id,
        version: version.version,
        status: version.status,
      },
    },
    {
      depth: null,
    },
  );
}

main()
  .catch((error) => {
    console.error(
      "❌ Seed Running Template gagal:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
