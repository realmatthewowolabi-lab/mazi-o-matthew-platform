const SUPABASE_URL = "https://fwbzqbjnisipjzadyzxh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hudHuFPKIgBDh2zPki6u6g_Sdc1rp7x";

const configured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
let authMode = "signup";
let currentUser = null;

function setStatus(text = "") { $("status").textContent = text; }

function showAuth(mode = "signup") {
  authMode = mode;
  $("authModal").classList.remove("hidden");
  $("authTitle").textContent = mode === "signup" ? "Create account" : "Welcome back";
  $("authSubmit").textContent = mode === "signup" ? "Sign Up" : "Login";
  $("signupFields").style.display = mode === "signup" ? "block" : "none";
  $("toggleAuth").textContent = mode === "signup" ? "Already have an account? Login" : "Don't have an account? Sign Up";
  $("authMessage").textContent = "";
}

function closeAuth() {
  $("authModal").classList.add("hidden");
  $("authForm").reset();
  $("authMessage").textContent = "";
}

function initials(name = "User") {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "U";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));
}

async function loadProfile() {
  if (!supabaseClient || !currentUser) return null;
  const { data } = await supabaseClient.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
  return data;
}

async function refreshAuth() {
  if (!supabaseClient) {
    currentUser = null;
    $("authButton").textContent = "Login / Sign Up";
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  $("authButton").textContent = currentUser ? "Logout" : "Login / Sign Up";
}

async function signUp() {
  const fullName = $("fullName").value.trim();
  const username = $("username").value.trim().toLowerCase();
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!fullName || !username) throw new Error("Please enter your full name and username.");
  const { data, error } = await supabaseClient.auth.signUp({
    email, password, options: { data: { full_name: fullName, username } }
  });
  if (error) throw error;
  if (data.session) {
    currentUser = data.user;
    closeAuth();
    await render("home");
  } else {
    $("authMessage").textContent = "Account created. Check your email to confirm your account, then log in.";
  }
}

async function login() {
  const email = $("email").value.trim();
  const password = $("password").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentUser = data.user;
  closeAuth();
  await render("home");
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  await render("home");
}

async function forgotPassword() {
  if (!supabaseClient) return;
  const email = $("email").value.trim();
  if (!email) {
    $("authMessage").textContent = "Enter your email address first.";
    return;
  }
  const redirect = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: redirect });
  $("authMessage").textContent = error ? error.message : "Password reset instructions have been sent to your email.";
}

async function getPosts() {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from("posts")
    .select("id,content,media_url,created_at,user_id,profiles:profiles!posts_user_id_fkey(full_name,username)")
    .order("created_at", { ascending: false }).limit(50);
  if (error) { console.error(error); return []; }
  return data || [];
}

function postCard(post) {
  const profile = post.profiles || {};
  const name = profile.full_name || profile.username || "User";
  const media = post.media_url
    ? `<img class="post-media" src="${escapeHtml(post.media_url)}" alt="Post media">`
    : "";

  const deleteButton = currentUser && post.user_id === currentUser.id
    ? `<button class="delete-post" data-post-id="${escapeHtml(post.id)}">🗑️ Delete</button>`
    : "";

  return `<article class="post">
    <div class="post-head">
      <div class="avatar">${escapeHtml(initials(name))}</div>
      <div>
        <strong>${escapeHtml(name)}</strong><br>
        <small>@${escapeHtml(profile.username || "user")}</small>
      </div>
    </div>

    <div class="post-body">${escapeHtml(post.content || "")}</div>
    ${media}

    <div class="post-actions">
      <button>♡ Like</button>
      <button>💬 Comment</button>
      ${deleteButton}
    </div>
  </article>`;
}
async function deletePost(postId) {
  if (!currentUser) return;

  const confirmed = confirm("Are you sure you want to delete this post?");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", currentUser.id);

  if (error) {
    alert(error.message);
    return;
  }

  await render("home");
}
async function createPost() {
  if (!currentUser) { showAuth("signup"); return; }
  const content = $("postContent").value.trim();
  if (!content) return;
  const { error } = await supabaseClient.from("posts").insert({ user_id: currentUser.id, content });
  if (error) { $("composerMessage").textContent = error.message; return; }
  await render("home");
}

async function renderHome() {
  const posts = await getPosts();
  const composer = currentUser
    ? `<div class="composer"><textarea id="postContent" placeholder="Share something with your community..."></textarea>
       <div class="row"><button class="primary" id="publishPost">Publish</button><span id="composerMessage" class="message"></span></div></div>`
    : `<div class="composer"><strong>Join Mazi O Matthew Platform</strong>
       <p>Sign up or log in to publish posts and build your profile.</p>
       <button class="primary" id="joinFeed">Join the Platform</button></div>`;
  $("viewContent").innerHTML = `<div class="feed">${composer}<div id="posts">
    ${posts.length ? posts.map(postCard).join("") : `<div class="profile-card"><h3>Your community starts here.</h3><p>No posts yet. Be the first to share something.</p></div>`}
  </div></div>`;
  $("publishPost")?.addEventListener("click", createPost);

  document.querySelectorAll(".delete-post").forEach(button => {
  button.addEventListener("click", () => deletePost(button.dataset.postId));
});
  
  $("joinFeed")?.addEventListener("click", () => showAuth("signup"));
}

async function updateProfile() {
  if (!currentUser) return;

  const fullName = $("editFullName").value.trim();
  const username = $("editUsername").value.trim().toLowerCase();
  const bio = $("editBio").value.trim();

  if (!fullName || !username) {
    $("profileMessage").textContent = "Name and username are required.";
    return;
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      full_name: fullName,
      username: username,
      bio: bio
    })
    .eq("id", currentUser.id);

  if (error) {
    $("profileMessage").textContent = error.message;
    return;
  }

  $("profileMessage").textContent = "Profile updated successfully.";
  await renderProfile();
}

async function renderProfile() {
  if (!currentUser) {
    $("viewContent").innerHTML = `<div class="profile-card">
      <h2>Your Profile</h2>
      <p>Please log in to view your profile.</p>
      <button class="primary" id="profileLogin">Login / Sign Up</button>
    </div>`;

    $("profileLogin").onclick = () => showAuth("signup");
    return;
  }

  const profile = await loadProfile();

  const name = profile?.full_name || currentUser.user_metadata?.full_name || "User";
  const username = profile?.username || currentUser.user_metadata?.username || "user";
  const bio = profile?.bio || "";

  $("viewContent").innerHTML = `<div class="profile-card">
    <div class="profile-avatar" id="profileAvatar">${escapeHtml(initials(name))}</div>

<input type="file" id="avatarFile" accept="image/*" style="display:none;">

<button class="primary" id="uploadAvatar">📸 Change Profile Photo</button>

    <h2>Edit Your Profile</h2>

    <label>Full Name</label>
    <input id="editFullName" value="${escapeHtml(name)}">

    <label>Username</label>
    <input id="editUsername" value="${escapeHtml(username)}">

    <label>Bio</label>
    <textarea id="editBio" placeholder="Tell people about yourself...">${escapeHtml(bio)}</textarea>

    <button class="primary" id="saveProfile">Save Profile</button>

    <p id="profileMessage" class="message"></p>
  </div>`;

  $("saveProfile").addEventListener("click", updateProfile);
  $("uploadAvatar").addEventListener("click", () => $("avatarFile").click());

$("avatarFile").addEventListener("change", uploadAvatar);
}
async function uploadAvatar() {
  if (!currentUser) return;

  const file = $("avatarFile").files[0];

  if (!file) {
    $("profileMessage").textContent = "Please select a photo first.";
    return;
  }

  const fileExt = file.name.split(".").pop();
  const filePath = `${currentUser.id}/avatar.${fileExt}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    $("profileMessage").textContent = uploadError.message;
    return;
  }

  const { data } = supabaseClient
    .storage
    .from("avatars")
    .getPublicUrl(filePath);

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", currentUser.id);

  if (updateError) {
    $("profileMessage").textContent = updateError.message;
    return;
  }

  $("profileMessage").textContent = "Profile photo updated successfully.";
  await renderProfile();
      }
async function renderDiscover() {
  $("viewContent").innerHTML = `<div class="profile-card"><h2>Discover</h2>
    <p>Discover people and content on the Mazi O Matthew Platform.</p>
    <p>More discovery features can be added as your community grows.</p></div>`;
}

async function render(view = "home") {
  setStatus(configured ? "" : "Supabase is not connected yet. Add your Supabase URL and anon key in app.js.");
  if (view === "profile") return renderProfile();
  if (view === "discover") return renderDiscover();
  return renderHome();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!configured) {
    $("authMessage").textContent = "Supabase is not connected. Add the two Supabase values at the top of app.js first.";
    return;
  }
  $("authMessage").textContent = "Working...";
  try {
    if (authMode === "signup") await signUp();
    else await login();
  } catch (error) {
    $("authMessage").textContent = error.message || "Something went wrong.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("[data-view]").forEach(button =>
    button.addEventListener("click", () => render(button.dataset.view))
  );
  $("authButton").addEventListener("click", () => currentUser ? logout() : showAuth("signup"));
  $("heroAuth").addEventListener("click", () => currentUser ? render("profile") : showAuth("signup"));
  $("closeAuth").addEventListener("click", closeAuth);
  $("toggleAuth").addEventListener("click", () => showAuth(authMode === "signup" ? "login" : "signup"));
  $("forgotPassword").addEventListener("click", forgotPassword);
  $("authForm").addEventListener("submit", handleAuthSubmit);

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      $("authButton").textContent = currentUser ? "Logout" : "Login / Sign Up";
    });
  }
  await refreshAuth();
  await render("home");
});
