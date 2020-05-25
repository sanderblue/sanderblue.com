<template>
  <div id="page" class="container">
    <div class="relative w-5/6">
      <div
        v-for="item in items"
        :key="item.message"
        class="max-w-sm rounded overflow-hidden shadow-lg mb-12"
      >
        <a :href="item.demo" target="_blank" class="block">
          <img class="w-full" :src="item.thumbnail" alt="" />
          <div class="px-6 py-4 bg-white">
            <div class="font-bold text-xl mb-2">{{ item.title }}</div>
            <p class="text-gray-700 text-base">
              {{ item.description }}
            </p>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  components: {},
  data() {
    return {
      items: [
        {
          title: 'Our Solar System',
          description:
            'A scaled 3D model of the Solar System, powered by Three.js and WebGL, modeled to scale based on real astronomical data.',
          demo: 'https://sanderblue.github.io/solar-system-threejs/',
          github: 'https://github.com/sanderblue/solar-system-threejs',
          thumbnail: '/images/thumbnail-solar-system.jpg',
          tags: ['ES6', 'Three.js', 'Backbone', 'Gulp', 'WebGL', '3D', 'AMD'],
        },
        {
          title: 'Know Your Snow',
          description:
            'An app to explore snow depth observation data from the Northwest Avalanche Center data portal.',
          demo: 'https://knowyoursnow.com',
          github: 'https://github.com/sanderblue/wx',
          thumbnail: '/images/thumbnail-know-your-snow.jpg',
          tags: ['TypeScript', 'Vue.js', 'ApexCharts', 'DataViz'],
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped></style>
