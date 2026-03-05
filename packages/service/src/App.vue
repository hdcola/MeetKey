<script setup lang="ts">
import { ref } from 'vue';

const message = ref('MeetKey Service');
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold">{{ message }}</h1>
    <p class="text-gray-600">Central service for MeetKey</p>
  </div>
</template>

<style scoped>
</style>
