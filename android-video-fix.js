// Android phone videos may be valid even when their metadata codec cannot be previewed.
window.selectListingVideo=async function(file){
  if(!file)return;
  const extension=(file.name.split(".").pop()||"").toLowerCase();
  const allowed=new Set(["mp4","webm","mov","m4v","3gp","3g2","mkv"]);
  if(!(file.type||"").startsWith("video/")&&!allowed.has(extension))return showToast("Choose a video from your phone.");
  if(file.size>50*1024*1024)return showToast("Video must be smaller than 50 MB.");
  let duration=null;
  try{duration=await videoDuration(file)}catch(error){console.warn("Android video metadata unavailable",error)}
  if(Number.isFinite(duration)&&duration>30.5)return showToast("Video must be 30 seconds or shorter.");
  clearListingVideo();
  listingVideoFile=file;
  listingVideoPreviewUrl=URL.createObjectURL(file);
  const status=Number.isFinite(duration)?`${Math.ceil(duration)} seconds · ready to upload`:"Video selected · ready to upload";
  videoPreview.innerHTML=`<video src="${listingVideoPreviewUrl}" controls playsinline preload="metadata"></video><button type="button" data-remove-video>Remove video</button><p>${status}</p>`;
};
