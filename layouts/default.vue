<template>
  <div>
    <nuxt />
  </div>
</template>

<style lang="scss">
$linear-gradient-dark: linear-gradient(
  rgba(15, 15, 15, 0.5),
  rgba(15, 15, 15, 0.5)
);
$background-image: $linear-gradient-dark, url('/images/20180831-IMGP3418.jpg');

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

.bg-image {
  background-image: $background-image;
}
</style>
