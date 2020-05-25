<template>
  <main class="pt-28">
    <Nav />
    <nuxt />
  </main>
</template>

<script>
import Vue from 'vue';
import Nav from '~/components/Nav.vue';

export default Vue.extend({
  components: {
    Nav,
  },
});
</script>

<style lang="scss">
html {
  font-family: 'Avenir', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

.bg-cover-image {
  background: $bg-gradient,
    $bg-gradient-color url('/images/20180831-IMGP3418.jpg') no-repeat center
      center fixed;
  background-size: cover;
}
*,
*:before,
*:after {
  box-sizing: border-box;
  margin: 0;
}

.button--green {
  display: inline-block;
  border-radius: 4px;
  border: 1px solid #3b8070;
  color: #3b8070;
  text-decoration: none;
  padding: 10px 30px;
}

.button--green:hover {
  color: #fff;
  background-color: #3b8070;
}

.button--grey {
  display: inline-block;
  border-radius: 4px;
  border: 1px solid #35495e;
  color: #35495e;
  text-decoration: none;
  padding: 10px 30px;
  margin-left: 15px;
}

.button--grey:hover {
  color: #fff;
  background-color: #35495e;
}
</style>
