package com.llegate.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.model.LocationPoint
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.RacingRed500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400

@Composable
fun AddressSearchScreen(
    originText: String,
    destinationText: String,
    popularDestinations: List<LocationPoint>,
    recentDestinations: List<LocationPoint>,
    favoriteDestinations: List<LocationPoint>,
    showFavorites: Boolean,
    onShowFavoritesChange: (Boolean) -> Unit,
    onBackClick: () -> Unit,
    onOriginClick: () -> Unit,
    onSelectFromMapClick: () -> Unit,
    onDestinationSelected: (LocationPoint) -> Unit,
    modifier: Modifier = Modifier
) {
    val addresses = if (showFavorites) favoriteDestinations else recentDestinations
    var isSearching by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    val filteredDestinations = popularDestinations.filter {
        it.title.contains(searchQuery, ignoreCase = true) ||
            it.subtitle.contains(searchQuery, ignoreCase = true)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Asphalt950)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            IconButton(
                onClick = onBackClick,
                modifier = Modifier.testTag("address_search_back")
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Volver al inicio",
                    tint = Stone100
                )
            }
            Text(
                text = "Direcciones de viaje",
                color = Stone100,
                fontSize = 19.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Asphalt900,
            border = BorderStroke(1.dp, Asphalt700)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                AddressField(
                    label = "ORIGEN",
                    value = originText,
                    icon = Icons.Default.MyLocation,
                    iconTint = Emerald500,
                    testTag = "address_origin_field",
                    onClick = onOriginClick
                )
                Box(
                    modifier = Modifier
                        .padding(start = 4.dp)
                        .width(1.dp)
                        .height(1.dp)
                        .background(Asphalt700)
                )
                AddressField(
                    label = "DESTINO",
                    value = destinationText,
                    icon = Icons.Default.LocationOn,
                    iconTint = RacingRed500,
                    trailingIcon = Icons.Default.Add,
                    testTag = "address_destination_field",
                    onClick = { isSearching = true }
                )
            }
        }

        if (isSearching) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .testTag("address_destination_search"),
                placeholder = { Text("Buscar calle, plaza o comercio", color = Stone400) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = RacingYellow500,
                    unfocusedBorderColor = Asphalt700,
                    focusedTextColor = Stone100,
                    unfocusedTextColor = Stone100
                )
            )
            if (filteredDestinations.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(190.dp)
                        .padding(top = 6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(filteredDestinations, key = { "popular:${it.title}:${it.lat}:${it.lng}" }) { point ->
                        Card(
                            onClick = {
                                isSearching = false
                                searchQuery = ""
                                onDestinationSelected(point)
                            },
                            colors = CardDefaults.cardColors(containerColor = Asphalt900),
                            border = BorderStroke(1.dp, Asphalt800),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.LocationOn, null, tint = RacingYellow500)
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(point.title, color = Stone100, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        point.subtitle,
                                        color = Stone400,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                Text(
                    text = "No encontramos destinos con esa búsqueda.",
                    color = Stone400,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(vertical = 12.dp)
                )
            }
        }

        Surface(
            shape = RoundedCornerShape(14.dp),
            color = Asphalt900,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
                .clickable(onClick = onSelectFromMapClick)
                .testTag("select_destination_from_map")
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 15.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = Emerald500
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Selecciona la dirección desde el mapa",
                    color = Emerald500,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 22.dp, bottom = 10.dp)
        ) {
            FilterChip(
                selected = !showFavorites,
                onClick = { onShowFavoritesChange(false) },
                label = { Text("Recientes") },
                leadingIcon = {
                    Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp))
                },
                modifier = Modifier.testTag("recent_destinations_tab")
            )
            FilterChip(
                selected = showFavorites,
                onClick = { onShowFavoritesChange(true) },
                label = { Text("Favoritos") },
                leadingIcon = {
                    Icon(Icons.Default.Favorite, contentDescription = null, modifier = Modifier.size(18.dp))
                },
                modifier = Modifier.testTag("favorite_destinations_tab")
            )
        }

        if (addresses.isEmpty()) {
            Text(
                text = if (showFavorites) {
                    "Todavía no tienes direcciones favoritas guardadas."
                } else {
                    "Tus destinos recientes aparecerán aquí."
                },
                color = Stone400,
                fontSize = 13.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 18.dp)
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(
                    items = addresses,
                    key = { "${it.lat}:${it.lng}:${it.title}" }
                ) { point ->
                    Card(
                        onClick = { onDestinationSelected(point) },
                        colors = CardDefaults.cardColors(containerColor = Asphalt900),
                        border = BorderStroke(1.dp, Asphalt800),
                        shape = RoundedCornerShape(13.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("quick_destination_${point.title.hashCode()}")
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (showFavorites) Icons.Default.Favorite else Icons.Default.History,
                                contentDescription = null,
                                tint = RacingYellow500,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = point.title,
                                    color = Stone100,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                if (point.subtitle.isNotBlank()) {
                                    Text(
                                        text = point.subtitle,
                                        color = Stone400,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AddressField(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: androidx.compose.ui.graphics.Color,
    testTag: String,
    onClick: () -> Unit,
    trailingIcon: androidx.compose.ui.graphics.vector.ImageVector? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag(testTag),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                color = Stone400,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.8.sp
            )
            Text(
                text = value,
                color = Stone100,
                fontSize = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        trailingIcon?.let {
            Icon(imageVector = it, contentDescription = "Buscar destino", tint = Stone300)
        }
    }
}
