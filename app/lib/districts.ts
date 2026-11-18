// Kecamatan of Kota Bekasi (12) and Kabupaten Bekasi (23). A card shows a district, never an address.
export const DISTRICT_GROUPS = [
  {
    label: "Kota Bekasi",
    items: [
      "Bantargebang", "Bekasi Barat", "Bekasi Selatan", "Bekasi Timur", "Bekasi Utara", "Jatiasih",
      "Jatisampurna", "Medan Satria", "Mustika Jaya", "Pondok Gede", "Pondok Melati", "Rawalumbu",
    ],
  },
  {
    label: "Kabupaten Bekasi",
    items: [
      "Babelan", "Bojongmangu", "Cabangbungin", "Cibarusah", "Cibitung", "Cikarang Barat", "Cikarang Pusat",
      "Cikarang Selatan", "Cikarang Timur", "Cikarang Utara", "Karangbahagia", "Kedungwaringin", "Muaragembong",
      "Pebayuran", "Serang Baru", "Setu", "Sukakarya", "Sukatani", "Sukawangi", "Tambelang", "Tambun Selatan",
      "Tambun Utara", "Tarumajaya",
    ],
  },
  { label: "Elsewhere", items: ["Outside Bekasi"] },
] as const;

export const DISTRICTS: readonly string[] = DISTRICT_GROUPS.flatMap((g) => g.items);
