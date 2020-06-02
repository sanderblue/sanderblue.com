<template>
  <div class="container flex-col">
    <div class="mb-48">
      <SanderBlue></SanderBlue>

      <div class="profile-links text-center mt-8">
        <a
          v-for="item in socialProfiles"
          :key="item.message"
          :href="item.url"
          :aria-label="item.name"
          class="social-profile-link flex flex-col"
          target="_blank"
        >
          <i :class="'fi-social-' + item.name"></i>
          <div class="social-label text-center pt-2">{{ item.name }}</div>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SanderBlue from '~/components/SanderBlue.vue';

export default Vue.extend({
  components: {
    SanderBlue,
  },
  data() {
    return {
      socialProfiles: [
        {
          name: 'github',
          url: 'https://github.com/sanderblue',
        },
        {
          name: 'twitter',
          url: 'https://twitter.com/SanderBlue',
        },
        {
          name: 'linkedin',
          url: 'https://www.linkedin.com/in/sanderblue',
        },
      ],
    };
  },
});
</script>

<style lang="scss">
/**
 * Sonar Effect
 */
$sonar-circle-width: 4px;
$sonar-color: rgba(188, 230, 254, 0.4);
$sonar-opacity-start: 0.2;
$sonar-opacity-middle: 0.4;
$sonar-opacity-end: 0;
$sonar-scale-end: 1.5;
$sonar-box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1),
  0 0 $sonar-circle-width $sonar-circle-width $sonar-color,
  0 0 0 $sonar-circle-width rgba(255, 255, 255, 0.8);

@keyframes sonarEffect {
  0% {
    opacity: $sonar-opacity-start;
  }
  40% {
    opacity: $sonar-opacity-middle;
    box-shadow: $sonar-box-shadow;
  }
  100% {
    box-shadow: $sonar-box-shadow;
    transform: scale($sonar-scale-end);
    opacity: $sonar-opacity-end;
  }
}

@-webkit-keyframes sonarEffect {
  0% {
    opacity: $sonar-opacity-start;
  }
  40% {
    opacity: $sonar-opacity-middle;
    box-shadow: $sonar-box-shadow;
  }
  100% {
    box-shadow: $sonar-box-shadow;
    -webkit-transform: scale($sonar-scale-end);
    opacity: $sonar-opacity-end;
  }
}

@-moz-keyframes sonarEffect {
  0% {
    opacity: $sonar-opacity-start;
  }
  40% {
    opacity: $sonar-opacity-middle;
    box-shadow: $sonar-box-shadow;
  }
  100% {
    box-shadow: $sonar-box-shadow;
    -moz-transform: scale($sonar-scale-end);
    opacity: $sonar-opacity-end;
  }
}

.fi-social {
  &-github {
    filter: invert(1);
    opacity: 0.5;
    background: $icon-base64-github no-repeat center center;
  }

  &-twitter {
    filter: invert(1);
    opacity: 0.5;
    background: $icon-base64-twitter no-repeat center center;
  }

  &-linkedin {
    filter: invert(1);
    opacity: 0.5;
    background: $icon-base64-linkedin no-repeat center center;
  }
}

.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  color: #526488;
  word-spacing: 5px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
}

.appear {
  animation: 0.3s appear;
  opacity: 1;
}

@keyframes appear {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes appearLight {
  0% {
    opacity: 0.25;
  }
  100% {
    opacity: 0.75;
  }
}

$social-icon-size: 60px;
$social-icon-font-size: 1.65rem;
$social-icon-scale-end: 1.1;

.social-profile-link {
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
  margin: 0 15px;
  width: $social-icon-size;
  height: $social-icon-size;
  border-radius: 50%;
  text-align: center;
  position: relative;
  z-index: 1;
  color: rgba(240, 240, 240, 0.6);
  background: rgba(255, 255, 255, 0.075);
  -webkit-transition: -webkit-transform ease-out 0.1s, background 0.2s;
  -moz-transition: -moz-transform ease-out 0.1s, background 0.2s;
  transition: transform ease-out 200ms, background 200ms, color 750ms;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:after {
    pointer-events: none;
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    content: '';
    -webkit-box-sizing: content-box;
    -moz-box-sizing: content-box;
    box-sizing: content-box;
    top: 0;
    left: 0;
    padding: 0;
    z-index: -1;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
    opacity: 0;
    -webkit-transform: scale(0.9);
    -moz-transform: scale(0.9);
    -ms-transform: scale(0.9);
    transform: scale(0.9);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(250, 250, 250, 0.95);

    .social-label {
      -webkit-animation: appearLight 1200ms ease-out;
      -moz-animation: appearLight 1200ms ease-out;
      animation: appearLight 1200ms ease-out;
      opacity: 0.75;
    }

    i {
      -webkit-transform: scale($social-icon-scale-end);
      -moz-transform: scale($social-icon-scale-end);
      -ms-transform: scale($social-icon-scale-end);
      transform: scale($social-icon-scale-end);
    }

    &:after {
      -webkit-animation: sonarEffect 1200ms ease-out 75ms;
      -moz-animation: sonarEffect 1200ms ease-out 75ms;
      animation: sonarEffect 1200ms ease-out 75ms;
    }
  }

  i {
    -webkit-transition: -webkit-transform ease-out 0.1s, background 0.2s;
    -moz-transition: -moz-transform ease-out 0.1s, background 0.2s;
    transition: transform ease-out 0.1s, background 0.2s;
    transform-origin: center;
    font-size: $social-icon-font-size;
    height: inherit;
    display: block;

    &:before {
      height: inherit;
      width: 100%;
      max-width: $social-icon-size;
      text-align: center;
      display: block;
      line-height: $social-icon-size;
      letter-spacing: 0.01em;
    }
  }

  .social-label {
    opacity: 0.25;
  }
}
</style>
