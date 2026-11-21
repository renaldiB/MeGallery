/**
 * Comprehensive Spatial Dataset & Nearest-Neighbor Resolver
 * Covers Kota Palembang (18 Kecamatan & key Kelurahan)
 * and surrounding Kabupaten/Kota across Sumatera Selatan.
 * Optimized for 100% offline reverse-geocoding in remote areas.
 */

export const SUMSEL_LOCATIONS = [
  // =========================================================================
  // KOTA PALEMBANG (18 Kecamatan & Key Kelurahan)
  // =========================================================================
  { lat: -2.9912, lng: 104.7554, village: 'Kel. 24 Ilir', district: 'Kec. Bukit Kecil', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9945, lng: 104.7512, village: 'Kel. 26 Ilir', district: 'Kec. Bukit Kecil', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9882, lng: 104.7582, village: 'Kel. 19 Ilir', district: 'Kec. Bukit Kecil', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9852, lng: 104.7532, village: 'Kel. 22 Ilir', district: 'Kec. Bukit Kecil', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9895, lng: 104.7472, village: 'Kel. 23 Ilir', district: 'Kec. Bukit Kecil', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9752, lng: 104.7314, village: 'Kel. Demang Lebar Daun', district: 'Kec. Ilir Barat I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9825, lng: 104.7385, village: 'Kel. Lorok Pakjo', district: 'Kec. Ilir Barat I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9652, lng: 104.7212, village: 'Kel. Siring Agung', district: 'Kec. Ilir Barat I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9892, lng: 104.7285, village: 'Kel. Bukit Lama', district: 'Kec. Ilir Barat I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9952, lng: 104.7185, village: 'Kel. Bukit Baru', district: 'Kec. Ilir Barat I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -3.0031, lng: 104.7432, village: 'Kel. 30 Ilir', district: 'Kec. Ilir Barat II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0085, lng: 104.7385, village: 'Kel. 32 Ilir', district: 'Kec. Ilir Barat II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0112, lng: 104.7325, village: 'Kel. 35 Ilir', district: 'Kec. Ilir Barat II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9985, lng: 104.7485, village: 'Kel. 29 Ilir', district: 'Kec. Ilir Barat II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9962, lng: 104.7452, village: 'Kel. 28 Ilir', district: 'Kec. Ilir Barat II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9942, lng: 104.7425, village: 'Kel. 27 Ilir', district: 'Kec. Ilir Barat II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9815, lng: 104.7612, village: 'Kel. 16 Ilir', district: 'Kec. Ilir Timur I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9785, lng: 104.7645, village: 'Kel. 17 Ilir', district: 'Kec. Ilir Timur I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9742, lng: 104.7585, village: 'Kel. 20 Ilir D-I', district: 'Kec. Ilir Timur I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9692, lng: 104.7545, village: 'Kel. 20 Ilir D-II', district: 'Kec. Ilir Timur I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9645, lng: 104.7512, village: 'Kel. Sungai Pangeran', district: 'Kec. Ilir Timur I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9712, lng: 104.7615, village: 'Kel. Kepandean', district: 'Kec. Ilir Timur I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9758, lng: 104.7892, village: 'Kel. 1 Ilir', district: 'Kec. Ilir Timur II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9712, lng: 104.7952, village: 'Kel. 2 Ilir', district: 'Kec. Ilir Timur II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9685, lng: 104.7885, village: 'Kel. 3 Ilir', district: 'Kec. Ilir Timur II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9612, lng: 104.7942, village: 'Kel. 5 Ilir', district: 'Kec. Ilir Timur II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9795, lng: 104.7812, village: 'Kel. Lawang Kidul', district: 'Kec. Ilir Timur II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9691, lng: 104.7735, village: 'Kel. 8 Ilir', district: 'Kec. Ilir Timur III', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9742, lng: 104.7712, village: 'Kel. 9 Ilir', district: 'Kec. Ilir Timur III', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9785, lng: 104.7745, village: 'Kel. 10 Ilir', district: 'Kec. Ilir Timur III', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9812, lng: 104.7782, village: 'Kel. 11 Ilir', district: 'Kec. Ilir Timur III', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9652, lng: 104.7685, village: 'Kel. Duku', district: 'Kec. Ilir Timur III', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9985, lng: 104.7645, village: 'Kel. 1 Ulu', district: 'Kec. Seberang Ulu I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0012, lng: 104.7682, village: 'Kel. 2 Ulu', district: 'Kec. Seberang Ulu I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0042, lng: 104.7712, village: 'Kel. 3-4 Ulu', district: 'Kec. Seberang Ulu I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0075, lng: 104.7742, village: 'Kel. 5 Ulu', district: 'Kec. Seberang Ulu I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9942, lng: 104.7612, village: 'Kel. 7 Ulu', district: 'Kec. Seberang Ulu I', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -3.0052, lng: 104.7812, village: 'Kel. 11 Ulu', district: 'Kec. Seberang Ulu II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0085, lng: 104.7845, village: 'Kel. 12 Ulu', district: 'Kec. Seberang Ulu II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0112, lng: 104.7885, village: 'Kel. 13 Ulu', district: 'Kec. Seberang Ulu II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0142, lng: 104.7912, village: 'Kel. 14 Ulu', district: 'Kec. Seberang Ulu II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0175, lng: 104.7952, village: 'Kel. 16 Ulu', district: 'Kec. Seberang Ulu II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0012, lng: 104.7852, village: 'Kel. Tangga Takat', district: 'Kec. Seberang Ulu II', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -3.0185, lng: 104.7725, village: 'Kel. 15 Ulu', district: 'Kec. Jakabaring', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0125, lng: 104.7685, village: 'Kel. Silaberanti', district: 'Kec. Jakabaring', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0085, lng: 104.7625, village: 'Kel. Tuan Kentang', district: 'Kec. Jakabaring', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0152, lng: 104.7785, village: 'Kel. 8 Ulu', district: 'Kec. Jakabaring', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -3.0084, lng: 104.8142, village: 'Kel. Plaju Ulu', district: 'Kec. Plaju', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0145, lng: 104.8252, village: 'Kel. Plaju Darat', district: 'Kec. Plaju', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0025, lng: 104.8052, village: 'Kel. Bagus Kuning', district: 'Kec. Plaju', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0012, lng: 104.8182, village: 'Kel. Komperta', district: 'Kec. Plaju', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0245, lng: 104.8192, village: 'Kel. Talang Putri', district: 'Kec. Plaju', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0185, lng: 104.8052, village: 'Kel. Talang Bubuk', district: 'Kec. Plaju', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -3.0245, lng: 104.7382, village: 'Kel. Kertapati', district: 'Kec. Kertapati', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0312, lng: 104.7452, village: 'Kel. Kemang Agung', district: 'Kec. Kertapati', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0385, lng: 104.7352, village: 'Kel. Kemas Rindo', district: 'Kec. Kertapati', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0192, lng: 104.7512, village: 'Kel. Ogan Baru', district: 'Kec. Kertapati', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0512, lng: 104.7212, village: 'Kel. Karya Jaya', district: 'Kec. Kertapati', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -3.0112, lng: 104.6892, village: 'Kel. Gandus', district: 'Kec. Gandus', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0052, lng: 104.7125, village: 'Kel. Karang Anyar', district: 'Kec. Gandus', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0085, lng: 104.7012, village: 'Kel. Karang Jaya', district: 'Kec. Gandus', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -3.0252, lng: 104.6652, village: 'Kel. Pulo Kerto', district: 'Kec. Gandus', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9245, lng: 104.7182, village: 'Kel. Sukarami', district: 'Kec. Sukarami', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9385, lng: 104.7252, village: 'Kel. Kebun Bunga', district: 'Kec. Sukarami', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9452, lng: 104.7352, village: 'Kel. Sukabangun', district: 'Kec. Sukarami', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9152, lng: 104.7312, village: 'Kel. Sukodadi', district: 'Kec. Sukarami', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.8985, lng: 104.7112, village: 'Kel. Talang Betutu', district: 'Kec. Sukarami', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.8912, lng: 104.7285, village: 'Kel. Talang Jambe', district: 'Kec. Sukarami', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9152, lng: 104.6854, village: 'Kel. Alang-Alang Lebar', district: 'Kec. Alang-Alang Lebar', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9052, lng: 104.6752, village: 'Kel. Talang Kelapa', district: 'Kec. Alang-Alang Lebar', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9312, lng: 104.6985, village: 'Kel. Karya Baru', district: 'Kec. Alang-Alang Lebar', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9412, lng: 104.7112, village: 'Kel. Srijaya', district: 'Kec. Alang-Alang Lebar', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9562, lng: 104.7492, village: 'Kel. Ario Kemuning', district: 'Kec. Kemuning', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9485, lng: 104.7552, village: 'Kel. Pipa Reja', district: 'Kec. Kemuning', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9612, lng: 104.7585, village: 'Kel. Pahlawan', district: 'Kec. Kemuning', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9652, lng: 104.7452, village: 'Kel. Sekip Jaya', district: 'Kec. Kemuning', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9425, lng: 104.7612, village: 'Kel. Talang Aman', district: 'Kec. Kemuning', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9352, lng: 104.7925, village: 'Kel. Sako', district: 'Kec. Sako', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9252, lng: 104.8012, village: 'Kel. Sako Baru', district: 'Kec. Sako', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9452, lng: 104.7812, village: 'Kel. Sukamaju', district: 'Kec. Sako', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9412, lng: 104.8052, village: 'Kel. Sialang', district: 'Kec. Sako', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9612, lng: 104.8215, village: 'Kel. Kalidoni', district: 'Kec. Kalidoni', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9512, lng: 104.8085, village: 'Kel. Bukit Sangkal', district: 'Kec. Kalidoni', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9685, lng: 104.8312, village: 'Kel. Sei Selayur', district: 'Kec. Kalidoni', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9752, lng: 104.8452, village: 'Kel. Sei Selincah', district: 'Kec. Kalidoni', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9812, lng: 104.8582, village: 'Kel. Sei Lais', district: 'Kec. Kalidoni', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  { lat: -2.9285, lng: 104.8242, village: 'Kel. Lebong Gajah', district: 'Kec. Sematang Borang', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9212, lng: 104.8352, village: 'Kel. Sukamulya', district: 'Kec. Sematang Borang', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9352, lng: 104.8412, village: 'Kel. Srimulya', district: 'Kec. Sematang Borang', regency: 'Kota Palembang', province: 'Sumatera Selatan' },
  { lat: -2.9185, lng: 104.8482, village: 'Kel. Karya Mulya', district: 'Kec. Sematang Borang', regency: 'Kota Palembang', province: 'Sumatera Selatan' },

  // =========================================================================
  // KABUPATEN OGAN ILIR (OI)
  // =========================================================================
  { lat: -3.2356, lng: 104.6542, village: 'Kel. Indralaya Indah', district: 'Kec. Indralaya', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.2412, lng: 104.6485, village: 'Desa Sakatiga', district: 'Kec. Indralaya', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.1512, lng: 104.6685, village: 'Desa Pulau Semambu', district: 'Kec. Indralaya Utara', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.1812, lng: 104.6812, village: 'Desa Palem Raya', district: 'Kec. Indralaya Utara', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.1252, lng: 104.6352, village: 'Desa Lorok', district: 'Kec. Indralaya Utara', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.2845, lng: 104.6412, village: 'Desa Meranjat', district: 'Kec. Indralaya Selatan', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3125, lng: 104.6312, village: 'Desa Tebing Gerinting', district: 'Kec. Indralaya Selatan', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.0924, lng: 104.7485, village: 'Desa Pemulutan Ilir', district: 'Kec. Pemulutan', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.1052, lng: 104.7552, village: 'Desa Ibul Besar', district: 'Kec. Pemulutan', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.0852, lng: 104.7012, village: 'Desa Talang Pangeran', district: 'Kec. Pemulutan Barat', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.1452, lng: 104.7452, village: 'Desa Naikan Tembakang', district: 'Kec. Pemulutan Selatan', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3452, lng: 104.6985, village: 'Kel. Tanjung Raja', district: 'Kec. Tanjung Raja', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3612, lng: 104.7125, village: 'Desa Belanti', district: 'Kec. Tanjung Raja', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3912, lng: 104.7412, village: 'Desa Rantau Panjang', district: 'Kec. Rantau Panjang', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.4215, lng: 104.5912, village: 'Kel. Tanjung Batu', district: 'Kec. Tanjung Batu', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.4582, lng: 104.5215, village: 'Kel. Payaraman', district: 'Kec. Payaraman', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.5824, lng: 104.5985, village: 'Kel. Muara Kuang', district: 'Kec. Muara Kuang', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.5124, lng: 104.4985, village: 'Desa Tambang Rambang', district: 'Kec. Rambang Kuang', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.4812, lng: 104.6452, village: 'Desa Lubuk Keliat', district: 'Kec. Lubuk Keliat', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3852, lng: 104.7892, village: 'Desa Sungai Pinang', district: 'Kec. Sungai Pinang', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3125, lng: 104.7952, village: 'Desa Kandis', district: 'Kec. Kandis', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },
  { lat: -3.4125, lng: 104.7125, village: 'Desa Rantau Alai', district: 'Kec. Rantau Alai', regency: 'Kab. Ogan Ilir', province: 'Sumatera Selatan' },

  // =========================================================================
  // KABUPATEN BANYUASIN
  // =========================================================================
  { lat: -2.8952, lng: 104.6612, village: 'Kel. Sukajadi', district: 'Kec. Talang Kelapa', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.8752, lng: 104.6412, village: 'Desa Air Batu', district: 'Kec. Talang Kelapa', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.8852, lng: 104.6852, village: 'Kel. Tanah Mas', district: 'Kec. Talang Kelapa', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.9985, lng: 104.8712, village: 'Kel. Mariana', district: 'Kec. Banyuasin I', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.9812, lng: 104.8952, village: 'Desa Perajen', district: 'Kec. Banyuasin I', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.8852, lng: 104.3852, village: 'Kel. Pangkalan Balai', district: 'Kec. Banyuasin III', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.7125, lng: 104.2152, village: 'Kel. Betung', district: 'Kec. Betung', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.7252, lng: 104.1952, village: 'Kel. Rimba Asam', district: 'Kec. Betung', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -3.1125, lng: 104.8512, village: 'Desa Rambutan', district: 'Kec. Rambutan', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.6852, lng: 104.7812, village: 'Desa Tanjung Lago', district: 'Kec. Tanjung Lago', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.3452, lng: 104.9125, village: 'Desa Sungsang I', district: 'Kec. Banyuasin II', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.5215, lng: 104.9812, village: 'Kel. Makarti Jaya', district: 'Kec. Makarti Jaya', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.5852, lng: 104.8512, village: 'Desa Telang Jaya', district: 'Kec. Muara Telang', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.6512, lng: 105.0215, village: 'Desa Air Salek', district: 'Kec. Air Salek', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.7512, lng: 105.2152, village: 'Desa Tirta Harja', district: 'Kec. Muara Sugihan', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.4852, lng: 104.5812, village: 'Desa Teluk Betung', district: 'Kec. Pulau Rimau', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.7912, lng: 104.3125, village: 'Desa Lubuk Lancang', district: 'Kec. Suak Tapeh', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.9512, lng: 104.3512, village: 'Desa Tebing Abang', district: 'Kec. Rantau Bayur', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.4125, lng: 104.2812, village: 'Desa Suka Mulya', district: 'Kec. Tungkal Ilir', regency: 'Kab. Banyuasin', province: 'Sumatera Selatan' },

  // =========================================================================
  // KABUPATEN OGAN KOMERING ILIR (OKI)
  // =========================================================================
  { lat: -3.3952, lng: 104.8452, village: 'Kel. Sidakersa', district: 'Kec. Kota Kayu Agung', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3812, lng: 104.8312, village: 'Kel. Kayu Agung Asli', district: 'Kec. Kota Kayu Agung', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.4412, lng: 104.8712, village: 'Desa Pedamaran I', district: 'Kec. Pedamaran', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.5125, lng: 105.0125, village: 'Desa Sumber Hidup', district: 'Kec. Pedamaran Timur', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.8125, lng: 104.9852, village: 'Desa Tugu Mulyo', district: 'Kec. Lempuing', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.7512, lng: 104.9125, village: 'Desa Lubuk Seberuk', district: 'Kec. Lempuing Jaya', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.9852, lng: 105.2152, village: 'Desa Pematang Panggang', district: 'Kec. Mesuji', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.9125, lng: 105.0812, village: 'Desa Bina Karsa', district: 'Kec. Mesuji Makmur', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.8512, lng: 105.1512, village: 'Desa Gedung Rejo', district: 'Kec. Mesuji Raya', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.2852, lng: 105.3512, village: 'Desa Tulung Selapan Ilir', district: 'Kec. Tulung Selapan', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.4852, lng: 105.4125, village: 'Desa Cengal', district: 'Kec. Cengal', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -2.8952, lng: 105.2812, village: 'Desa Kerta Mukti', district: 'Kec. Air Sugihan', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.6512, lng: 105.4812, village: 'Desa Sungai Menang', district: 'Kec. Sungai Menang', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.2512, lng: 104.9512, village: 'Desa Pampangan', district: 'Kec. Pampangan', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.3125, lng: 104.8812, village: 'Desa Terusan Menang', district: 'Kec. Sirah Pulau Padang', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.1852, lng: 104.8912, village: 'Desa Jejawi', district: 'Kec. Jejawi', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.4852, lng: 104.8912, village: 'Desa Serapek', district: 'Kec. Teluk Gelam', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },
  { lat: -3.6125, lng: 104.8412, village: 'Desa Tanjung Lubuk', district: 'Kec. Tanjung Lubuk', regency: 'Kab. Ogan Komering Ilir', province: 'Sumatera Selatan' },

  // =========================================================================
  // KABUPATEN MUSI BANYUASIN (MUBA)
  // =========================================================================
  { lat: -2.8852, lng: 103.8452, village: 'Kel. Balai Agung', district: 'Kec. Sekayu', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.8912, lng: 103.8582, village: 'Kel. Serasan Jaya', district: 'Kec. Sekayu', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.5512, lng: 104.0812, village: 'Kel. Sungai Lilin', district: 'Kec. Sungai Lilin', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.0512, lng: 103.6812, village: 'Kel. Bayung Lencir', district: 'Kec. Bayung Lencir', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.7812, lng: 103.6125, village: 'Kel. Babat Toman', district: 'Kec. Babat Toman', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.6852, lng: 103.9512, village: 'Kel. Keluang', district: 'Kec. Keluang', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.7912, lng: 104.0125, village: 'Desa Lais', district: 'Kec. Lais', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.9512, lng: 103.6812, village: 'Desa Sialang Agung', district: 'Kec. Plakat Tinggi', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.7125, lng: 103.4812, village: 'Kel. Ngulak', district: 'Kec. Sanga Desa', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.8125, lng: 103.7125, village: 'Desa Karang Ringin', district: 'Kec. Lawang Wetan', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -3.0125, lng: 103.7512, village: 'Desa Tebing Bulang', district: 'Kec. Sungai Keruh', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.2512, lng: 103.8812, village: 'Desa Peninggalan', district: 'Kec. Tungkal Jaya', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },
  { lat: -2.2125, lng: 104.4512, village: 'Desa Bandar Agung', district: 'Kec. Lalan', regency: 'Kab. Musi Banyuasin', province: 'Sumatera Selatan' },

  // =========================================================================
  // KABUPATEN MUARA ENIM
  // =========================================================================
  { lat: -3.6512, lng: 103.7812, village: 'Kel. Pasar I', district: 'Kec. Muara Enim', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.7412, lng: 103.8125, village: 'Kel. Tanjung Enim', district: 'Kec. Lawang Kidul', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.8512, lng: 103.7812, village: 'Desa Tanjung Agung', district: 'Kec. Tanjung Agung', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.3125, lng: 104.4125, village: 'Kel. Gelumbang', district: 'Kec. Gelumbang', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.3852, lng: 104.4512, village: 'Desa Lembak', district: 'Kec. Lembak', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.1852, lng: 104.4812, village: 'Desa Sukarami', district: 'Kec. Sungai Rotan', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.1252, lng: 104.5812, village: 'Desa Patra Tani', district: 'Kec. Muara Belida', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.5125, lng: 103.9512, village: 'Desa Gunung Megang Luar', district: 'Kec. Gunung Megang', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.5852, lng: 103.8812, village: 'Desa Ujan Mas Baru', district: 'Kec. Ujan Mas', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.4812, lng: 103.7812, village: 'Desa Padang Bindu', district: 'Kec. Benakat', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.5512, lng: 104.1812, village: 'Desa Tebat Agung', district: 'Kec. Rambang Niru', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.4512, lng: 104.2512, village: 'Desa Dangku', district: 'Kec. Empat Petulai Dangku', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.4125, lng: 104.3812, village: 'Desa Tanjung Bunut', district: 'Kec. Belida Darat', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -3.7125, lng: 104.3512, village: 'Desa Beringin', district: 'Kec. Lubai', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },
  { lat: -4.1125, lng: 103.5512, village: 'Desa Pulau Panggung', district: 'Kec. Semende Darat Laut', regency: 'Kab. Muara Enim', province: 'Sumatera Selatan' },

  // =========================================================================
  // KOTA PRABUMULIH
  // =========================================================================
  { lat: -3.4352, lng: 104.2412, village: 'Kel. Prabumulih', district: 'Kec. Prabumulih Barat', regency: 'Kota Prabumulih', province: 'Sumatera Selatan' },
  { lat: -3.4212, lng: 104.2612, village: 'Kel. Prabujaya', district: 'Kec. Prabumulih Timur', regency: 'Kota Prabumulih', province: 'Sumatera Selatan' },
  { lat: -3.4612, lng: 104.2512, village: 'Kel. Tanjung Raman', district: 'Kec. Prabumulih Selatan', regency: 'Kota Prabumulih', province: 'Sumatera Selatan' },
  { lat: -3.4012, lng: 104.2312, village: 'Kel. Wonosari', district: 'Kec. Prabumulih Utara', regency: 'Kota Prabumulih', province: 'Sumatera Selatan' },
  { lat: -3.3752, lng: 104.2685, village: 'Kel. Cambai', district: 'Kec. Cambai', regency: 'Kota Prabumulih', province: 'Sumatera Selatan' },
  { lat: -3.5112, lng: 104.2112, village: 'Desa Karangan', district: 'Kec. Rambang Kapak Tengah', regency: 'Kota Prabumulih', province: 'Sumatera Selatan' },

  // =========================================================================
  // KABUPATEN PENUKAL ABAB LEMATANG ILIR (PALI)
  // =========================================================================
  { lat: -3.2852, lng: 103.8512, village: 'Kel. Talang Ubi Timur', district: 'Kec. Talang Ubi', regency: 'Kab. PALI', province: 'Sumatera Selatan' },
  { lat: -3.2912, lng: 103.8385, village: 'Kel. Handayani Mulya', district: 'Kec. Talang Ubi', regency: 'Kab. PALI', province: 'Sumatera Selatan' },
  { lat: -3.2125, lng: 104.0125, village: 'Desa Betung', district: 'Kec. Abab', regency: 'Kab. PALI', province: 'Sumatera Selatan' },
  { lat: -3.2412, lng: 103.9512, village: 'Desa Babat', district: 'Kec. Penukal', regency: 'Kab. PALI', province: 'Sumatera Selatan' },
  { lat: -3.3852, lng: 104.0512, village: 'Desa Tanah Abang', district: 'Kec. Tanah Abang', regency: 'Kab. PALI', province: 'Sumatera Selatan' },
  { lat: -3.1512, lng: 103.9125, village: 'Desa Air Itam', district: 'Kec. Penukal Utara', regency: 'Kab. PALI', province: 'Sumatera Selatan' },

  // =========================================================================
  // KABUPATEN LAHAT & SEKITARNYA
  // =========================================================================
  { lat: -3.7912, lng: 103.5412, village: 'Kel. Pasar Baru', district: 'Kec. Lahat', regency: 'Kab. Lahat', province: 'Sumatera Selatan' },
  { lat: -3.7512, lng: 103.6212, village: 'Desa Merapi', district: 'Kec. Merapi Barat', regency: 'Kab. Lahat', province: 'Sumatera Selatan' },
  { lat: -3.7125, lng: 103.7125, village: 'Desa Arahan', district: 'Kec. Merapi Timur', regency: 'Kab. Lahat', province: 'Sumatera Selatan' },
  { lat: -3.8125, lng: 103.3512, village: 'Desa Bunga Mas', district: 'Kec. Kikim Timur', regency: 'Kab. Lahat', province: 'Sumatera Selatan' },
  { lat: -4.0252, lng: 103.2512, village: 'Kel. Kuripan Babas', district: 'Kec. Pagar Alam Utara', regency: 'Kota Pagar Alam', province: 'Sumatera Selatan' },
  { lat: -3.2952, lng: 102.8612, village: 'Kel. Lubuklinggau Ilir', district: 'Kec. Lubuklinggau Barat I', regency: 'Kota Lubuklinggau', province: 'Sumatera Selatan' },
  { lat: -4.1252, lng: 104.1712, village: 'Kel. Baturaja Lama', district: 'Kec. Baturaja Timur', regency: 'Kab. Ogan Komering Ulu', province: 'Sumatera Selatan' },
  { lat: -4.3125, lng: 104.3512, village: 'Kel. Martapura', district: 'Kec. Martapura', regency: 'Kab. OKU Timur', province: 'Sumatera Selatan' },
  { lat: -4.5125, lng: 104.0512, village: 'Kel. Muaradua', district: 'Kec. Muaradua', regency: 'Kab. OKU Selatan', province: 'Sumatera Selatan' }
];

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearest location in Sumatera Selatan dataset
 * Returns best match with distance in km
 */
export function findNearestSumselLocation(lat, lng, maxDistanceKm = 80) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  let bestMatch = null;
  let minDistance = Infinity;

  for (const item of SUMSEL_LOCATIONS) {
    const dist = haversineDistance(lat, lng, item.lat, item.lng);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = item;
    }
  }

  if (bestMatch && minDistance <= maxDistanceKm) {
    return {
      ...bestMatch,
      distanceKm: minDistance
    };
  }

  return null;
}
