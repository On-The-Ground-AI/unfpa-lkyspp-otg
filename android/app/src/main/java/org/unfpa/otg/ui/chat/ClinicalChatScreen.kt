package org.unfpa.otg.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import org.unfpa.otg.knowledge.CitationRepository

/**
 * ClinicalChatScreen — specialized chat interface for clinical queries.
 *
 * Features:
 *   - Clinical query mode with specialization context (e.g., maternal health, emergency)
 *   - Citation display with source documents
 *   - Dose calculator integration
 *   - Emergency protocol quick access
 *   - Condition-specific guideline suggestions
 *   - Offline-accessible clinical context
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClinicalChatScreen(
    viewModel: ChatViewModel = viewModel(),
    onNavigateToSettings: () -> Unit = {},
    onNavigateToDrugs: () -> Unit = {},
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    var inputText by remember { mutableStateOf("") }
    var selectedCitationChunkId by remember { mutableStateOf<String?>(null) }
    var selectedProtocolId by remember { mutableStateOf<String?>(null) }

    // Scroll to bottom on new messages
    LaunchedEffect(uiState.messages.size) {
        if (uiState.messages.isNotEmpty()) {
            scope.launch { listState.animateScrollToItem(uiState.messages.size - 1) }
        }
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("Clinical Assistant") },
                    actions = {
                        IconButton(onClick = onNavigateToDrugs) {
                            Icon(Icons.Default.Search, contentDescription = "Drug Lookup")
                        }
                        IconButton(onClick = onNavigateToSettings) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings")
                        }
                    },
                )
                ClinicalModeBanner(mode = uiState.mode, country = uiState.country)
            }
        },
        bottomBar = {
            Column {
                if (uiState.isLoading && uiState.statusMessage.isNotBlank()) {
                    StatusIndicator(message = uiState.statusMessage)
                }
                ClinicalMessageInput(
                    text = inputText,
                    enabled = !uiState.isLoading && !uiState.isInitialising,
                    onTextChange = { inputText = it },
                    onSend = {
                        viewModel.sendMessage(inputText.trim())
                        inputText = ""
                    },
                    onQuickAction = { action ->
                        viewModel.sendMessage(action)
                        inputText = ""
                    },
                )
            }
        },
    ) { padding ->
        when {
            uiState.isInitialising -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            uiState.initialisationError != null -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Text(
                        "Error: ${uiState.initialisationError}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
            else -> {
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(uiState.messages) { message ->
                        when (message.role) {
                            "user" -> {
                                UserMessageBubble(content = message.content)
                            }
                            "assistant" -> {
                                AssistantMessageBubble(
                                    content = message.content,
                                    onCitationTap = { chunkId ->
                                        selectedCitationChunkId = chunkId
                                    },
                                )
                            }
                        }
                    }

                    if (uiState.isLoading) {
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    strokeWidth = 2.dp,
                                )
                                Text(
                                    "Assistant is thinking...",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Citation drawer
    if (selectedCitationChunkId != null) {
        CitationDrawer(
            chunkId = selectedCitationChunkId!!,
            citationRepository = remember { CitationRepository(context) },
            onDismiss = { selectedCitationChunkId = null },
        )
    }
}

@Composable
private fun ClinicalModeBanner(mode: String, country: String) {
    val (backgroundColor, textColor, modeLabel) = when (mode) {
        "clinical" -> Triple(
            Color(0xFF1976D2),
            Color.White,
            "Clinical Mode"
        )
        "pregnancy" -> Triple(
            Color(0xFF388E3C),
            Color.White,
            "Pregnancy Care Mode"
        )
        "emergency" -> Triple(
            Color(0xFFD32F2F),
            Color.White,
            "Emergency Protocol Mode"
        )
        else -> Triple(
            Color(0xFF757575),
            Color.White,
            mode
        )
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(backgroundColor)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = modeLabel,
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = textColor,
                ),
            )
            Text(
                text = country,
                style = MaterialTheme.typography.labelSmall.copy(
                    color = textColor.copy(alpha = 0.9f),
                ),
            )
        }
        Text(
            text = getClinicalModeDisclaimer(mode),
            style = MaterialTheme.typography.labelSmall.copy(
                color = textColor.copy(alpha = 0.85f),
            ),
        )
    }
}

private fun getClinicalModeDisclaimer(mode: String): String = when (mode) {
    "clinical" -> "Evidence-based clinical guidelines and protocols. Always consult local authorities."
    "pregnancy" -> "Maternal health and pregnancy management. Offline clinical reference."
    "emergency" -> "Emergency protocols and critical care. For trained personnel only."
    else -> "Clinical reference mode. Verify with local guidelines."
}

@Composable
private fun UserMessageBubble(content: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 40.dp),
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer,
            ),
        ) {
            Text(
                text = content,
                modifier = Modifier.padding(12.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
private fun AssistantMessageBubble(
    content: String,
    onCitationTap: (String) -> Unit = {},
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(end = 40.dp),
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
            ),
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Parse and render citations
                val parts = content.split(Regex("""\[SRC:([^\]]+)\]"""))
                var isPart = false
                parts.forEach { part ->
                    if (isPart && part.length <= 50) {
                        // This is a chunk ID
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    MaterialTheme.colorScheme.primaryContainer,
                                    RoundedCornerShape(4.dp)
                                )
                                .clickable { onCitationTap(part) }
                                .padding(8.dp),
                        ) {
                            Text(
                                text = "📄 View source: $part",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = MaterialTheme.colorScheme.primary,
                                    fontStyle = FontStyle.Italic,
                                ),
                            )
                        }
                    } else {
                        Text(
                            text = part,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    isPart = !isPart
                }
            }
        }
    }
}

@Composable
private fun ClinicalMessageInput(
    text: String,
    enabled: Boolean = true,
    onTextChange: (String) -> Unit = {},
    onSend: () -> Unit = {},
    onQuickAction: (String) -> Unit = {},
) {
    var showQuickActions by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Quick action buttons
        if (showQuickActions) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                QuickActionButton(
                    label = "Eclampsia Protocol",
                    onClick = { onQuickAction("What is the emergency management protocol for eclampsia?") }
                )
                QuickActionButton(
                    label = "PPH Management",
                    onClick = { onQuickAction("How do I manage postpartum hemorrhage?") }
                )
                QuickActionButton(
                    label = "Drug Interactions",
                    onClick = { onQuickAction("Check drug interactions") }
                )
            }
        }

        // Input field
        OutlinedTextField(
            value = text,
            onValueChange = onTextChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            placeholder = { Text("Ask a clinical question...") },
            enabled = enabled,
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
            keyboardActions = KeyboardActions(onSend = { onSend() }),
            shape = MaterialTheme.shapes.medium,
            trailingIcon = {
                Row(
                    modifier = Modifier.padding(end = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    IconButton(
                        onClick = { showQuickActions = !showQuickActions },
                        modifier = Modifier.size(40.dp),
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = "Quick Actions",
                            tint = if (enabled)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.outline,
                        )
                    }
                    IconButton(
                        onClick = onSend,
                        enabled = enabled && text.isNotBlank(),
                        modifier = Modifier.size(40.dp),
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send")
                    }
                }
            },
        )
    }
}

@Composable
private fun QuickActionButton(label: String, onClick: () -> Unit) {
    ElevatedButton(
        onClick = onClick,
        modifier = Modifier.height(36.dp),
    ) {
        Text(label, fontSize = 12.sp)
    }
}

