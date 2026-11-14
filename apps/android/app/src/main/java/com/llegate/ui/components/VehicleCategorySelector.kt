package com.llegate.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.model.VEHICLE_CATEGORIES
import com.llegate.model.VehicleCategory
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import java.util.Locale

@Composable
fun VehicleCategorySelector(
    selectedCategoryId: String?,
    bcvExchangeRate: Double,
    onCategorySelected: (VehicleCategory) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                text = "Elige la categoría",
                color = Stone100,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                text = "Tarifas en USD y Bs. a la tasa BCV de ${String.format(Locale.US, "%.2f", bcvExchangeRate)} Bs/$",
                color = Stone400,
                fontSize = 11.sp
            )
        }

        VEHICLE_CATEGORIES.forEach { category ->
            VehicleCategoryCard(
                category = category,
                isSelected = category.id == selectedCategoryId,
                bcvExchangeRate = bcvExchangeRate,
                onClick = { onCategorySelected(category) }
            )
        }
    }
}

@Composable
private fun VehicleCategoryCard(
    category: VehicleCategory,
    isSelected: Boolean,
    bcvExchangeRate: Double,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = if (isSelected) Asphalt800 else Asphalt950,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.5.dp, if (isSelected) RacingYellow500 else Asphalt700),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("vehicle_category_${category.id}")
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = category.icon, fontSize = 24.sp)
            Spacer(modifier = Modifier.width(10.dp))

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = category.title,
                        color = Stone100,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1
                    )
                    category.tag?.let { tag ->
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            color = RacingYellow500.copy(alpha = 0.18f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = tag,
                                color = RacingYellow500,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Text(
                    text = category.description,
                    color = Stone400,
                    fontSize = 11.sp,
                    lineHeight = 14.sp
                )
            }

            Spacer(modifier = Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "$${String.format(Locale.US, "%.2f", category.priceUsd)}",
                    color = RacingYellow500,
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp
                )
                Text(
                    text = "Bs. ${String.format(Locale.US, "%,.0f", category.priceUsd * bcvExchangeRate).replace(',', '.')}",
                    color = Stone300,
                    fontSize = 11.sp
                )
            }
        }
    }
}
