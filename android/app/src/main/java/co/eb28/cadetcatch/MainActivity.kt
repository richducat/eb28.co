package co.eb28.cadetcatch

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit

private const val SearchUrl = "https://api.cadetcatch.com/search"
private const val AccessStatusUrl = "https://api.cadetcatch.com/access/status"
private const val GooglePlayLinkUrl = "https://api.cadetcatch.com/access/google-play/link"
private const val MonthlyProductId = "co.eb28.cadetcatch.family.monthly.v1"
private const val PackageName = "co.eb28.cadetcatch"

private val Navy = Color(0xFF06152B)
private val Orange = Color(0xFFFF4F18)
private val Background = Color(0xFFF3F7FC)
private val Muted = Color(0xFF66748A)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                CadetCatchApp()
            }
        }
    }
}

private enum class AppTab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Default.Home),
    Photos("Photos", Icons.Default.PhotoLibrary),
    Roster("Roster", Icons.Default.People),
    Info("Info", Icons.Default.Info),
    More("More", Icons.Default.MoreHoriz)
}

private enum class SearchRange(val label: String, val subtitle: String, val minScore: Double, val help: String) {
    High("High", "Strict", 0.80, "Shows only the closest-looking photos. Best for clear, front-facing pictures and fewer lookalikes."),
    Medium("Medium", "Balanced", 0.65, "Looks a little wider for different angles, lighting, and expressions while still filtering weaker guesses."),
    Low("Low", "Broad", 0.55, "Broadest search for side profiles or tough angles. Review these results carefully because lookalikes are more likely.")
}

private data class SearchMatch(
    val score: Double,
    val photoFile: String,
    val photoUrl: String,
    val faceIndex: Int?,
    val detScore: Double?,
) {
    val scoreLabel: String = "${(score * 100).toInt()}%"
    val title: String = photoFile.ifBlank { "Possible cadet match" }
}

private data class AccessStatus(
    val active: Boolean,
    val accessType: String,
    val role: String,
    val desktopAddOnActive: Boolean,
)

@Composable
private fun CadetCatchApp() {
    val context = LocalContext.current
    val activity = context as? ComponentActivity
    val scope = rememberCoroutineScope()
    val matches = remember { mutableStateListOf<SearchMatch>() }
    val savedMatches = remember { mutableStateListOf<SearchMatch>() }
    val billing = remember { CadetCatchBilling(context) }

    var selectedTab by remember { mutableStateOf(AppTab.Home) }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var selectedRange by remember { mutableStateOf(SearchRange.High) }
    var statusMessage by remember { mutableStateOf("Choose one clear photo of your cadet.") }
    var isSearching by remember { mutableStateOf(false) }
    var accountEmail by remember { mutableStateOf("") }
    var accessStatus by remember { mutableStateOf<AccessStatus?>(null) }
    var billingMessage by remember { mutableStateOf("Google Play subscription is ready for license testing after Play Console products are configured.") }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            selectedUri = uri
            statusMessage = "Cadet photo selected. Run a photo check when ready."
        }
    }

    LaunchedEffect(Unit) {
        billing.connect(
            onMessage = { billingMessage = it },
            onPurchaseToken = { token ->
                val email = accountEmail.trim().lowercase()
                if (email.contains("@")) {
                    scope.launch {
                        billingMessage = runCatching {
                            CadetCatchApi.linkGooglePlayPurchase(context, email, token)
                            "Subscription linked to this CadetCatch account."
                        }.getOrElse { "Purchase was received, but account access could not be linked yet." }
                    }
                } else {
                    billingMessage = "Purchase received. Enter your account email to link access."
                }
            }
        )
    }

    Surface(color = Background) {
        Scaffold(
            containerColor = Background,
            bottomBar = {
                NavigationBar(containerColor = Color.White) {
                    AppTab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = selectedTab == tab,
                            onClick = { selectedTab = tab },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) }
                        )
                    }
                }
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Header(selectedTab.label)
                when (selectedTab) {
                    AppTab.Home -> HomeScreen(
                        selectedUri = selectedUri,
                        selectedRange = selectedRange,
                        statusMessage = statusMessage,
                        isSearching = isSearching,
                        onPickPhoto = {
                            picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        },
                        onRangeChange = { selectedRange = it },
                        onSearch = {
                            val uri = selectedUri
                            if (uri == null) {
                                statusMessage = "Choose a clear cadet photo first."
                                return@HomeScreen
                            }
                            scope.launch {
                                isSearching = true
                                statusMessage = "Sending your cadet photo for matching..."
                                val result = runCatching {
                                    CadetCatchApi.search(context, uri, selectedRange)
                                }
                                isSearching = false
                                result.onSuccess { found ->
                                    matches.clear()
                                    matches.addAll(found)
                                    statusMessage = if (found.isEmpty()) {
                                        "No matching event photos found yet."
                                    } else {
                                        "${found.size} possible match${if (found.size == 1) "" else "es"} found."
                                    }
                                    selectedTab = AppTab.Photos
                                }.onFailure {
                                    statusMessage = it.message ?: "We could not search photos right now. Check your connection and try again."
                                }
                            }
                        }
                    )
                    AppTab.Photos -> PhotosScreen(
                        matches = matches,
                        savedMatches = savedMatches,
                        onSave = { match ->
                            if (!savedMatches.contains(match)) savedMatches.add(match)
                            scope.launch {
                                statusMessage = runCatching {
                                    CadetCatchApi.savePhoto(context, match)
                                    "Photo saved to your Gallery."
                                }.getOrElse { "Could not save that photo. Open the full photo and try again." }
                            }
                        },
                        onOpen = { match -> openUrl(context, match.photoUrl) },
                    )
                    AppTab.Roster -> RosterScreen(selectedUri)
                    AppTab.Info -> InfoScreen()
                    AppTab.More -> MoreScreen(
                        accountEmail = accountEmail,
                        accessStatus = accessStatus,
                        billingMessage = billingMessage,
                        onEmailChange = { accountEmail = it },
                        onCheckAccess = {
                            scope.launch {
                                val email = accountEmail.trim().lowercase()
                                accessStatus = runCatching { CadetCatchApi.accessStatus(context, email) }.getOrNull()
                            }
                        },
                        onSubscribe = {
                            if (activity == null) {
                                billingMessage = "Google Play purchase could not start from this screen."
                            } else {
                                billing.launchMonthlyPurchase(activity)
                            }
                        },
                        onRestore = { billing.restorePurchases() },
                    )
                }
            }
        }
    }
}

@Composable
private fun Header(title: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text("CadetCatch", color = Orange, fontSize = 13.sp, fontWeight = FontWeight.Black)
        Text(title, color = Navy, fontSize = 38.sp, fontWeight = FontWeight.Black)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeScreen(
    selectedUri: Uri?,
    selectedRange: SearchRange,
    statusMessage: String,
    isSearching: Boolean,
    onPickPhoto: () -> Unit,
    onRangeChange: (SearchRange) -> Unit,
    onSearch: () -> Unit,
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(bottom = 96.dp)
    ) {
        item {
            InfoCard {
                Text("Choose one clear photo of your cadet. CadetCatch compares it with uploaded event photos and shows possible matches for you to review.", color = Muted)
                Spacer(Modifier.height(14.dp))
                Button(onClick = onPickPhoto, colors = ButtonDefaults.buttonColors(containerColor = Navy)) {
                    Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text(if (selectedUri == null) "Choose Cadet Photo" else "Change Cadet Photo")
                }
            }
        }
        item {
            selectedUri?.let {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current).data(it).crossfade(true).build(),
                    contentDescription = "Selected cadet photo",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .clip(RoundedCornerShape(22.dp))
                )
            }
        }
        item {
            InfoCard {
                Text("Match range", color = Navy, fontWeight = FontWeight.Black, fontSize = 20.sp)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SearchRange.entries.forEach { range ->
                        FilterChip(
                            selected = selectedRange == range,
                            onClick = { onRangeChange(range) },
                            label = { Text("${range.label} ${range.minScore.asPercent()}") }
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(selectedRange.help, color = Muted)
            }
        }
        item {
            InfoCard {
                Text(statusMessage, color = Muted, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(14.dp))
                Button(
                    onClick = onSearch,
                    enabled = !isSearching,
                    colors = ButtonDefaults.buttonColors(containerColor = Orange)
                ) {
                    Icon(Icons.Default.Search, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text(if (isSearching) "Searching..." else "Run Photo Check")
                }
            }
        }
    }
}

@Composable
private fun PhotosScreen(
    matches: List<SearchMatch>,
    savedMatches: List<SearchMatch>,
    onSave: (SearchMatch) -> Unit,
    onOpen: (SearchMatch) -> Unit,
) {
    var showSaved by remember { mutableStateOf(false) }
    val visible = if (showSaved) savedMatches else matches
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            TextButton(onClick = { showSaved = false }) { Text("New", color = if (!showSaved) Orange else Muted) }
            TextButton(onClick = { showSaved = true }) { Text("Saved", color = if (showSaved) Orange else Muted) }
        }
        if (visible.isEmpty()) {
            EmptyState("No photos ready", "Run a photo check from Home after choosing a cadet photo.")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(bottom = 96.dp)) {
                items(visible) { match ->
                    MatchCard(match = match, onSave = { onSave(match) }, onOpen = { onOpen(match) })
                }
            }
        }
    }
}

@Composable
private fun MatchCard(match: SearchMatch, onSave: () -> Unit, onOpen: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
        Column {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(match.photoUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = "Possible CadetCatch match",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
            )
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(match.title, color = Navy, fontWeight = FontWeight.Black, fontSize = 20.sp)
                Text("Possible match: ${match.scoreLabel}", color = Muted)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onSave, colors = ButtonDefaults.buttonColors(containerColor = Orange)) {
                        Icon(Icons.Default.Save, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Save")
                    }
                    TextButton(onClick = onOpen) {
                        Icon(Icons.Default.OpenInNew, contentDescription = null)
                        Spacer(Modifier.size(6.dp))
                        Text("Open Full Photo")
                    }
                }
            }
        }
    }
}

@Composable
private fun RosterScreen(selectedUri: Uri?) {
    InfoCard {
        Text("Cadet roster", color = Navy, fontWeight = FontWeight.Black, fontSize = 22.sp)
        Spacer(Modifier.height(8.dp))
        Text("The Android version starts with one active cadet photo, matching the current search workflow.", color = Muted)
        if (selectedUri != null) {
            Spacer(Modifier.height(14.dp))
            Text("Cadet photo is ready for search.", color = Orange, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun InfoScreen() {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(bottom = 96.dp)) {
        item {
            InfoCard {
                Text("How to get better matches", color = Navy, fontWeight = FontWeight.Black, fontSize = 22.sp)
                Spacer(Modifier.height(8.dp))
                Text("Use a clear photo with one face visible. High is strict, Medium can help with angle changes, and Low is broad for tough side-profile photos.", color = Muted)
            }
        }
        item {
            InfoCard {
                Text("What CadetCatch searches", color = Navy, fontWeight = FontWeight.Black, fontSize = 22.sp)
                Spacer(Modifier.height(8.dp))
                Text("CadetCatch checks event photos that have been uploaded and indexed by the CadetCatch team. It does not search photos that are not in the CadetCatch photo collection.", color = Muted)
            }
        }
    }
}

@Composable
private fun MoreScreen(
    accountEmail: String,
    accessStatus: AccessStatus?,
    billingMessage: String,
    onEmailChange: (String) -> Unit,
    onCheckAccess: () -> Unit,
    onSubscribe: () -> Unit,
    onRestore: () -> Unit,
) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(bottom = 96.dp)) {
        item {
            InfoCard {
                Text("Account access", color = Navy, fontWeight = FontWeight.Black, fontSize = 22.sp)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = accountEmail,
                    onValueChange = onEmailChange,
                    label = { Text("Email address") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                Button(onClick = onCheckAccess, colors = ButtonDefaults.buttonColors(containerColor = Navy)) {
                    Icon(Icons.Default.AccountCircle, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Check Access")
                }
                accessStatus?.let {
                    Spacer(Modifier.height(10.dp))
                    Text(if (it.active) "CadetCatch access is active." else "No active account access was found.", color = if (it.active) Orange else Muted)
                }
            }
        }
        item {
            InfoCard {
                Text("Google Play subscription", color = Navy, fontWeight = FontWeight.Black, fontSize = 22.sp)
                Spacer(Modifier.height(8.dp))
                Text(billingMessage, color = Muted)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onSubscribe, colors = ButtonDefaults.buttonColors(containerColor = Orange)) {
                        Text("Subscribe")
                    }
                    TextButton(onClick = onRestore) { Text("Restore") }
                }
            }
        }
    }
}

@Composable
private fun InfoCard(content: @Composable ColumnScope.() -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), content = content)
    }
}

@Composable
private fun EmptyState(title: String, body: String) {
    Box(Modifier.fillMaxWidth().padding(top = 40.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Muted, modifier = Modifier.size(54.dp))
            Text(title, color = Navy, fontWeight = FontWeight.Black, fontSize = 24.sp)
            Text(body, color = Muted)
        }
    }
}

private object CadetCatchApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(25, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .callTimeout(120, TimeUnit.SECONDS)
        .build()

    suspend fun search(context: Context, uri: Uri, range: SearchRange): List<SearchMatch> = withContext(Dispatchers.IO) {
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IOException("Could not read that cadet photo. Choose a different image.")
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("top_k", "50")
            .addFormDataPart("min_score", "%.2f".format(range.minScore))
            .addFormDataPart("face_index", "0")
            .addFormDataPart("file", "cadet.jpg", bytes.toRequestBody("image/jpeg".toMediaType()))
            .build()
        val request = Request.Builder()
            .url(SearchUrl)
            .post(requestBody)
            .header("Accept", "application/json")
            .header("User-Agent", "CadetCatch-Android/1.0")
            .build()
        client.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val error = JSONObject(body.ifBlank { "{}" }).optString("detail", "We could not search photos right now.")
                throw IOException(error)
            }
            parseMatches(body)
        }
    }

    suspend fun accessStatus(context: Context, email: String): AccessStatus = withContext(Dispatchers.IO) {
        if (!email.contains("@")) throw IOException("Enter the email you use for CadetCatch access.")
        val url = Uri.parse(AccessStatusUrl).buildUpon()
            .appendQueryParameter("device_id", deviceId(context))
            .appendQueryParameter("email", email)
            .build()
            .toString()
        val request = Request.Builder().url(url).header("Accept", "application/json").build()
        client.newCall(request).execute().use { response ->
            val json = JSONObject(response.body?.string().orEmpty())
            AccessStatus(
                active = json.optBoolean("active"),
                accessType = json.optString("access_type"),
                role = json.optString("role"),
                desktopAddOnActive = json.optBoolean("desktop_add_on_active"),
            )
        }
    }

    suspend fun linkGooglePlayPurchase(context: Context, email: String, purchaseToken: String) = withContext(Dispatchers.IO) {
        val json = JSONObject()
            .put("device_id", deviceId(context))
            .put("email", email)
            .put("package_name", PackageName)
            .put("product_id", MonthlyProductId)
            .put("purchase_token", purchaseToken)
        val request = Request.Builder()
            .url(GooglePlayLinkUrl)
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Google Play purchase could not be verified yet.")
        }
    }

    suspend fun savePhoto(context: Context, match: SearchMatch) = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(match.photoUrl)
            .header("Accept", "image/*,*/*;q=0.8")
            .header("User-Agent", "CadetCatch-Android/1.0 photo-save")
            .build()
        val data = client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Could not download the full photo.")
            response.body?.bytes() ?: throw IOException("The photo download was empty.")
        }
        val filename = match.photoFile.ifBlank { "CadetCatch-${UUID.randomUUID()}.jpg" }
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/CadetCatch")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }
        val resolver = context.contentResolver
        val imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            ?: throw IOException("Could not create a Gallery photo.")
        resolver.openOutputStream(imageUri)?.use { it.write(data) }
            ?: throw IOException("Could not write the Gallery photo.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.clear()
            values.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(imageUri, values, null, null)
        }
    }

    private fun parseMatches(raw: String): List<SearchMatch> {
        val root = JSONObject(raw)
        val queryFacesDetected = root.optInt("query_faces_detected", 1)
        if (queryFacesDetected <= 0) throw IOException("No face detected. Choose a clearer, front-facing cadet photo.")
        val array = root.optJSONArray("matches") ?: return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val photoUrl = item.optString("photo_url")
                    .ifBlank { item.optString("original_url") }
                    .ifBlank { item.optString("thumbnail_url") }
                if (photoUrl.startsWith("https://")) {
                    add(
                        SearchMatch(
                            score = item.optDouble("score"),
                            photoFile = item.optString("photo_file").ifBlank { item.optString("original_filename") },
                            photoUrl = photoUrl,
                            faceIndex = if (item.has("face_index")) item.optInt("face_index") else null,
                            detScore = if (item.has("det_score")) item.optDouble("det_score") else null,
                        )
                    )
                }
            }
        }
    }

    private fun deviceId(context: Context): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        return "android-${androidId ?: UUID.randomUUID()}"
    }
}

private class CadetCatchBilling(private val context: Context) : PurchasesUpdatedListener {
    private var billingClient: BillingClient? = null
    private var productDetails: ProductDetails? = null
    private var onMessage: (String) -> Unit = {}
    private var onPurchaseToken: (String) -> Unit = {}

    fun connect(onMessage: (String) -> Unit, onPurchaseToken: (String) -> Unit) {
        this.onMessage = onMessage
        this.onPurchaseToken = onPurchaseToken
        val client = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()
        billingClient = client
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingServiceDisconnected() {
                onMessage("Google Play Billing disconnected. Try again in a moment.")
            }

            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryMonthlyProduct()
                } else {
                    onMessage("Google Play Billing is not available on this device yet.")
                }
            }
        })
    }

    fun launchMonthlyPurchase(activity: ComponentActivity) {
        val client = billingClient
        val details = productDetails
        if (client == null || details == null) {
            onMessage("Subscription is not available until the Play Console product is configured.")
            return
        }
        val offerToken = details.subscriptionOfferDetails?.firstOrNull()?.offerToken
        if (offerToken.isNullOrBlank()) {
            onMessage("Subscription offer is not ready in Google Play yet.")
            return
        }
        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .setOfferToken(offerToken)
            .build()
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()
        client.launchBillingFlow(activity, params)
    }

    fun restorePurchases() {
        val client = billingClient ?: return
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                onMessage("Could not restore Google Play purchases.")
                return@queryPurchasesAsync
            }
            val active = purchases.firstOrNull { purchase ->
                purchase.products.contains(MonthlyProductId) && purchase.purchaseState == Purchase.PurchaseState.PURCHASED
            }
            if (active != null) {
                onPurchaseToken(active.purchaseToken)
            } else {
                onMessage("No active CadetCatch subscription was found in Google Play.")
            }
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            onMessage("Purchase canceled.")
            return
        }
        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
            onMessage("Purchase could not be completed.")
            return
        }
        purchases.orEmpty()
            .firstOrNull { it.products.contains(MonthlyProductId) && it.purchaseState == Purchase.PurchaseState.PURCHASED }
            ?.let { onPurchaseToken(it.purchaseToken) }
    }

    private fun queryMonthlyProduct() {
        val product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(MonthlyProductId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(product))
            .build()
        billingClient?.queryProductDetailsAsync(params) { result, details ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK && details.isNotEmpty()) {
                productDetails = details.first()
                onMessage("CadetCatch Family Monthly is available through Google Play.")
            } else {
                onMessage("Google Play subscription product is not configured for this build yet.")
            }
        }
    }
}

private fun openUrl(context: Context, url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
}

private fun Double.asPercent(): String = "${(this * 100).toInt()}%+"
