const url = "https://nmkxwtheepwnovbalpgz.supabase.co/rest/v1/profiles?select=*";
const anonKey = "sb_publishable_r3DOIdo0xxix14sUG7j18g_z-h8Y2FK";

async function test() {
  const res = await fetch(url, {
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`
    }
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
}
test();
