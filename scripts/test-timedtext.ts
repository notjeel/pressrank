async function main() {
  const videoId = "HC4cHTBrPEo";
  const url1 = `https://video.google.com/timedtext?lang=en&v=${videoId}`;
  const url2 = `https://video.google.com/timedtext?lang=hi&v=${videoId}`;
  const url3 = `https://video.google.com/timedtext?type=list&v=${videoId}`;

  console.log("Fetching list...");
  const res3 = await fetch(url3);
  console.log("List status:", res3.status);
  console.log("List response:", await res3.text());

  console.log("\nFetching en...");
  const res1 = await fetch(url1);
  console.log("en status:", res1.status);
  console.log("en response preview:", (await res1.text()).substring(0, 200));

  console.log("\nFetching hi...");
  const res2 = await fetch(url2);
  console.log("hi status:", res2.status);
  console.log("hi response preview:", (await res2.text()).substring(0, 200));
}

main().catch(console.error);
